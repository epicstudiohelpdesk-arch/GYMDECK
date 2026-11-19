/**
 * GymDeck Cloud Backend - WhatsApp domain unit tests
 *
 * These are deterministic unit tests over the policy/rendering/security layer.
 * They require no Meta/OpenWA credentials and no database connection.
 *
 * Database-backed behaviour (queue persistence, webhook dedupe, restart
 * recovery) is enforced by unique constraints and exercised by integration
 * tests against a real Postgres instance; it is NOT claimed as executed here.
 */

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`❌ ${message} (expected ${String(expected)}, got ${String(actual)})`);
  }
}

async function run(): Promise<void> {
  console.log('🧪 Running WhatsApp domain tests...');

  const phone = await import('../services/whatsapp/phone.js');
  const variables = await import('../services/whatsapp/variables.js');
  const policy = await import('../services/whatsapp/policy.js');
  const signature = await import('../services/whatsapp/signature.js');
  const templates = await import('../services/whatsapp/templates.js');
  const openwa = await import('../services/whatsapp/openwaClient.js');
  const consent = await import('../services/whatsapp/consentService.js');

  // 1. Phone mapping / normalization
  assertEqual(phone.normalizeWhatsAppNumber('+91 98765 43210'), '919876543210', 'E.164 Indian number normalizes');
  assertEqual(phone.normalizeWhatsAppNumber('98765 43210'), '919876543210', '10-digit Indian number normalizes');
  assertEqual(phone.normalizeWhatsAppNumber('12345'), null, 'Short number is rejected');
  assertEqual(phone.normalizeWhatsAppNumber(null), null, 'Missing number is rejected');
  assertEqual(phone.isValidWhatsAppNumber('+91 98765 43210'), true, 'Valid number passes');
  assert(Boolean(phone.maskWhatsAppNumber('+919876543210')?.includes('3210')), 'Mask keeps last four digits');
  assert(!phone.maskWhatsAppNumber('+919876543210')?.includes('98765'), 'Mask hides middle digits');

  // 2. Variable rendering — strict, never silently blank
  const rendered = variables.renderWhatsAppMessage('Hi {{member_name}}, renew at {{gym_name}}.', {
    member_name: 'Aarav',
    gym_name: 'Iron House',
  });
  assertEqual(rendered.text, 'Hi Aarav, renew at Iron House.', 'Known variables render');
  assertEqual(rendered.missingVariables.length, 0, 'No missing variables reported');

  const missing = variables.renderWhatsAppMessage('Due {{payment_amount}} on {{payment_due_date}}.', {
    payment_amount: '₹1,500',
  });
  assert(missing.missingVariables.includes('payment_due_date'), 'Missing variable is reported');
  assert(!missing.text.includes('{{payment_due_date}}'), 'Missing variable is not left as raw placeholder');

  const unknown = variables.renderWhatsAppMessage('Hello {{admin_override}}', {});
  assert(unknown.unknownVariables.includes('admin_override'), 'Unknown variable is rejected');

  assertEqual(
    variables.extractVariableNames('{{member_name}} x {{payment_amount}}').join(','),
    'member_name,payment_amount',
    'Variable extraction preserves order'
  );

  // 3. 24-hour customer service window
  const now = new Date('2026-11-18T12:00:00.000Z');
  const openWindow = policy.computeServiceWindow(new Date('2026-11-18T00:00:00.000Z'), now);
  assertEqual(openWindow.isOpen, true, 'Inbound 12 hours ago keeps the window open');
  const closedWindow = policy.computeServiceWindow(new Date('2026-11-16T12:00:00.000Z'), now);
  assertEqual(closedWindow.isOpen, false, 'Inbound 48 hours ago closes the window');
  const boundary = policy.computeServiceWindow(new Date('2026-11-17T12:00:00.000Z'), now);
  assertEqual(boundary.isOpen, false, 'Exactly 24 hours is treated as closed');
  assertEqual(policy.computeServiceWindow(null, now).isOpen, false, 'No inbound message means closed');

  // 4. Delivery policy matrix
  const connected = policy.evaluateDelivery({
    accountStatus: 'CONNECTED',
    hasValidPhone: true,
    consentStatus: 'GRANTED',
    messageKind: 'UTILITY',
    windowOpen: true,
    template: null,
  });
  assertEqual(connected.allowed, true, 'Connected + consent + open window allows text');
  assertEqual(connected.mode, 'TEXT', 'Open window uses free-form text');

  const closedNoTemplate = policy.evaluateDelivery({
    accountStatus: 'CONNECTED',
    hasValidPhone: true,
    consentStatus: 'GRANTED',
    messageKind: 'UTILITY',
    windowOpen: false,
    template: null,
  });
  assertEqual(closedNoTemplate.allowed, false, 'Closed window without template is blocked');
  assertEqual(closedNoTemplate.reasonCode, 'TEMPLATE_REQUIRED', 'Closed window reports template required');

  const closedApproved = policy.evaluateDelivery({
    accountStatus: 'CONNECTED',
    hasValidPhone: true,
    consentStatus: 'GRANTED',
    messageKind: 'UTILITY',
    windowOpen: false,
    template: { approvalStatus: 'APPROVED', category: 'UTILITY' },
  });
  assertEqual(closedApproved.allowed, true, 'Approved utility template allows closed-window send');
  assertEqual(closedApproved.mode, 'TEMPLATE', 'Closed window uses template mode');

  const unapproved = policy.evaluateDelivery({
    accountStatus: 'CONNECTED',
    hasValidPhone: true,
    consentStatus: 'GRANTED',
    messageKind: 'UTILITY',
    windowOpen: false,
    template: { approvalStatus: 'PENDING', category: 'UTILITY' },
  });
  assertEqual(unapproved.allowed, false, 'Pending template is not usable');

  const marketingTemplate = policy.evaluateDelivery({
    accountStatus: 'CONNECTED',
    hasValidPhone: true,
    consentStatus: 'GRANTED',
    messageKind: 'UTILITY',
    windowOpen: false,
    template: { approvalStatus: 'APPROVED', category: 'MARKETING' },
  });
  assertEqual(marketingTemplate.allowed, false, 'Marketing template cannot be used for this feature');

  const noConsent = policy.evaluateDelivery({
    accountStatus: 'CONNECTED',
    hasValidPhone: true,
    consentStatus: 'WITHDRAWN',
    messageKind: 'UTILITY',
    windowOpen: true,
    template: null,
  });
  assertEqual(noConsent.allowed, false, 'Withdrawn consent blocks sending');
  assertEqual(noConsent.reasonCode, 'CONSENT_MISSING', 'Withdrawn consent reason is explicit');

  assertEqual(
    policy.evaluateDelivery({
      accountStatus: 'CONNECTED',
      hasValidPhone: true,
      consentStatus: 'GRANTED',
      messageKind: 'MARKETING',
      windowOpen: true,
      template: null,
    }).allowed,
    false,
    'Promotional messages are rejected by design'
  );

  assertEqual(
    policy.evaluateDelivery({
      accountStatus: 'DISCONNECTED',
      hasValidPhone: true,
      consentStatus: 'GRANTED',
      messageKind: 'UTILITY',
      windowOpen: true,
      template: null,
    }).allowed,
    false,
    'Disconnected account blocks sending'
  );

  assertEqual(
    policy.evaluateDelivery({
      accountStatus: 'SANDBOX',
      hasValidPhone: true,
      consentStatus: 'GRANTED',
      messageKind: 'UTILITY',
      windowOpen: true,
      template: null,
    }).allowed,
    false,
    'Legacy sandbox status cannot send without a linked OpenWA session'
  );

  assertEqual(
    policy.evaluateDelivery({
      accountStatus: 'DEVELOPMENT',
      hasValidPhone: true,
      consentStatus: 'GRANTED',
      messageKind: 'UTILITY',
      windowOpen: false,
      template: { approvalStatus: 'DEVELOPMENT_TEST', category: 'UTILITY' },
    }).allowed,
    false,
    'Legacy development sender cannot send through OpenWA'
  );

  // 5. Delivery status transitions are monotonic
  assertEqual(policy.mapProviderStatus('delivered'), 'DELIVERED', 'OpenWA delivered maps correctly');
  assertEqual(policy.mapProviderStatus('read'), 'READ', 'OpenWA read maps correctly');
  assertEqual(policy.mapProviderStatus('failed'), 'FAILED', 'OpenWA failed maps correctly');
  assertEqual(policy.mapProviderStatus('nonsense'), null, 'Unknown provider status is ignored');

  assertEqual(policy.applyDeliveryStatus('ACCEPTED', 'DELIVERED'), 'DELIVERED', 'Accepted promotes to delivered');
  assertEqual(policy.applyDeliveryStatus('DELIVERED', 'SENT'), null, 'Delivered never downgrades to sent');
  assertEqual(policy.applyDeliveryStatus('READ', 'DELIVERED'), null, 'Read never downgrades to delivered');
  assertEqual(policy.applyDeliveryStatus('FAILED', 'DELIVERED'), null, 'Failed is never resurrected');
  assertEqual(policy.applyDeliveryStatus('CANCELLED', 'QUEUED'), null, 'Cancelled is terminal');
  assertEqual(policy.applyDeliveryStatus('DELIVERED', 'FAILED'), null, 'Delivered is not overwritten by a late failure');

  // 6. Webhook signature security
  const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }));
  const appSecret = 'test_app_secret_value';
  const validSignature = signature.computeWebhookSignature(rawBody, appSecret);
  assertEqual(
    signature.verifyWebhookSignature(rawBody, validSignature, appSecret),
    true,
    'Valid HMAC signature is accepted'
  );
  assertEqual(
    signature.verifyWebhookSignature(Buffer.from('{"hello":"tampered"}'), validSignature, appSecret),
    false,
    'Tampered body is rejected'
  );
  assertEqual(
    signature.verifyWebhookSignature(rawBody, 'sha256=deadbeef', appSecret),
    false,
    'Forged signature is rejected'
  );
  assertEqual(
    signature.verifyWebhookSignature(rawBody, undefined, appSecret),
    false,
    'Missing signature is rejected'
  );

  // 7. Utility template catalog
  const intents = new Set(
    templates.UTILITY_TEMPLATES.map((definition: any) => definition.intent)
  );
  assertEqual(intents.size, templates.UTILITY_TEMPLATES.length, 'Every utility intent is unique');
  assert(
    templates.UTILITY_TEMPLATES.every((definition: any) => definition.category === 'UTILITY'),
    'Catalog contains utility templates only'
  );
  const paymentTemplate = templates.getUtilityTemplate('PAYMENT_RECEIVED');
  assert(Boolean(paymentTemplate), 'Payment received template exists');
  const components = templates.buildTemplateComponents(paymentTemplate!);
  assertEqual(components.category, 'UTILITY', 'Submission declares UTILITY category');
  assert(Array.isArray(components.components) && components.components.length > 0, 'Template body components are built');
  assertEqual(templates.getUtilityTemplate('NOT_A_REAL_INTENT'), null, 'Unknown intent is rejected');

  // 8. OpenWA error classification
  assertEqual(openwa.classifyOpenWAError(429, 'slow down').retryable, true, 'Rate limit is retryable');
  assertEqual(openwa.classifyOpenWAError(500, 'boom').errorClass, 'TRANSIENT', 'Server error is transient');
  assertEqual(openwa.classifyOpenWAError(400, 'number not registered').errorClass, 'INVALID_RECIPIENT', 'Unregistered number is invalid');
  assertEqual(openwa.classifyOpenWAError(401, 'bad key').errorClass, 'AUTHENTICATION', 'Bad API key is auth');
  assertEqual(openwa.classifyOpenWAError(404, 'missing').retryable, false, 'Missing session is permanent');

  // 9. Consent + opt-out keywords
  assertEqual(consent.isOptOutMessage('STOP'), true, 'STOP is an opt-out');
  assertEqual(consent.isOptOutMessage('  Unsubscribe.  '), true, 'Unsubscribe is an opt-out');
  assertEqual(consent.isOptOutMessage('Please stop by the gym tomorrow'), false, 'Normal text is not an opt-out');

  console.log('✅ WhatsApp domain tests passed');
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
