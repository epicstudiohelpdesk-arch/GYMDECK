/**
 * GymDeck Owner Mobile - Owner Sign Up Route
 *
 * Renders the unified in-place AuthScreen with initialTab="signup".
 * Switching between Log In and Sign Up occurs entirely in place
 * without scrolling or sliding the page.
 */

import React from 'react';
import OwnerAuthScreen from './login';

export default function SignupRoute() {
  return <OwnerAuthScreen initialTab="signup" />;
}
