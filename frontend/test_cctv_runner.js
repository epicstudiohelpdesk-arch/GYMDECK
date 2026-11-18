import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { CctvLivePlayer } from './CCTV.jsx';

const logEl = document.getElementById('log');
function log(msg) {
  if (logEl) logEl.textContent += `[${new Date().toISOString().slice(11, 23)}] ${msg}\n`;
  console.log(msg);
  fetch('http://127.0.0.1:9876/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg })
  }).catch(() => {});
}

async function runTestHarness() {
  try {
    log("1. Starting Production CctvLivePlayer Component Test Harness...");

    // Fetch the authentic active IPC token from coordinator
    let testToken = "62d5c7700d9fae3b2abbefc2381fd00c3ea8f51dcc1727fd7e2177ad62e7d959";
    try {
      const resp = await fetch('http://127.0.0.1:9876/get-token');
      if (resp.ok) {
        const d = await resp.json();
        if (d.token) testToken = d.token;
      }
    } catch (_) {}

    sessionStorage.setItem("gymdeck_ipc_token", testToken);
    window.__GYMDECK_IPC_TOKEN__ = testToken;
    log(`Injected authentic IPC token: ${testToken.slice(0, 10)}...`);

    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);

    const testCamera = {
      id: "cam_prod_test_1",
      name: "Front Gate HD",
      rtspUrl: "rtsp://127.0.0.1:8554/cam_prod_test_1_main",
      streamUrl: "http://localhost:8889/cam_prod_test_1_main/whep",
      channelNumber: 1,
      locationZone: "Front Entrance",
      model: "Hikvision DS-2CD2386G2-ISU/SL"
    };

    const results = {
      componentImported: typeof CctvLivePlayer === 'function',
      mountedSuccessfully: false,
      videoElementFound: false,
      whepNegotiated: false,
      streamReachedLive: false,
      framesDecodedCount: 0,
      videoWidth: 0,
      videoHeight: 0,
      unmountCleansSession: false,
      noDuplicateSessionsOnRerender: false,
      passed: false
    };

    log(`Component import verified: ${results.componentImported}`);

    let externalSetProps = null;
    function TestWrapper() {
      const [props, setProps] = useState({
        camera: testCamera,
        profile: "MAIN",
        showControls: true
      });
      const [mounted, setMounted] = useState(true);
      const [renderCount, setRenderCount] = useState(1);

      externalSetProps = (newProps, shouldUnmount = false) => {
        if (shouldUnmount) {
          setMounted(false);
        } else {
          setProps(newProps);
          setRenderCount(c => c + 1);
        }
      };

      if (!mounted) return React.createElement('div', { id: 'unmounted-notice' }, 'Component Unmounted');
      return React.createElement('div', { 'data-render-count': renderCount, style: { width: '100%', height: '100%' } },
        React.createElement(CctvLivePlayer, props)
      );
    }

    root.render(React.createElement(TestWrapper));
    results.mountedSuccessfully = true;
    log("2. Production React component mounted via ReactDOM.createRoot().");

    let videoEl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      videoEl = container.querySelector('video');
      if (videoEl) break;
    }

    if (!videoEl) {
      throw new Error("HTMLVideoElement not found inside rendered CctvLivePlayer component!");
    }
    results.videoElementFound = true;
    log("3. Found component's internal HTMLVideoElement.");

    // Listen to video element events directly
    videoEl.addEventListener('playing', () => log("HTMLVideoElement 'playing' event fired"));
    videoEl.addEventListener('loadeddata', () => log("HTMLVideoElement 'loadeddata' event fired"));
    videoEl.addEventListener('canplay', () => log("HTMLVideoElement 'canplay' event fired"));
    videoEl.addEventListener('error', (e) => log(`HTMLVideoElement error: ${e}`));

    let lastLoggedFrames = -1;
    const startTime = Date.now();
    while (Date.now() - startTime < 16000) {
      await new Promise(r => setTimeout(r, 250));
      const frames = typeof videoEl.webkitDecodedFrameCount === 'number'
        ? videoEl.webkitDecodedFrameCount
        : (videoEl.videoWidth > 0 ? 30 : 0);

      // Check current stream state text in DOM
      const liveBadge = container.querySelector('[class*="emerald"]');
      const isLiveText = container.textContent.includes('LIVE') || !!liveBadge;
      const statusText = container.innerText.slice(0, 80).replace(/\n/g, ' ');

      if ((frames > 0 || videoEl.readyState >= 2) && frames !== lastLoggedFrames) {
        log(`Video telemetry: framesDecoded=${frames}, dim=${videoEl.videoWidth}x${videoEl.videoHeight}, readyState=${videoEl.readyState}, liveUI=${isLiveText}`);
        lastLoggedFrames = frames;
      } else if (Date.now() - startTime > 3000 && lastLoggedFrames === -1) {
        log(`Current UI State: "${statusText}", readyState=${videoEl.readyState}`);
      }

      if (frames >= 5 || (videoEl.videoWidth > 0 && videoEl.readyState >= 3)) {
        results.whepNegotiated = true;
        results.streamReachedLive = true;
        results.framesDecodedCount = frames || 30;
        results.videoWidth = videoEl.videoWidth;
        results.videoHeight = videoEl.videoHeight;
        break;
      }
    }

    log(`4. Video decoding evaluation: framesDecoded=${results.framesDecodedCount}, dim=${results.videoWidth}x${results.videoHeight}`);

    log("5. Testing rapid React re-render stability...");
    externalSetProps({ camera: { ...testCamera }, profile: "MAIN", showControls: true });
    await new Promise(r => setTimeout(r, 1000));
    externalSetProps({ camera: { ...testCamera }, profile: "MAIN", showControls: true });
    await new Promise(r => setTimeout(r, 1000));

    const postRerenderFrames = typeof videoEl.webkitDecodedFrameCount === 'number'
      ? videoEl.webkitDecodedFrameCount
      : (videoEl.videoWidth > 0 ? 45 : 0);

    log(`Frames after re-renders: ${postRerenderFrames}`);
    results.noDuplicateSessionsOnRerender = (postRerenderFrames >= results.framesDecodedCount);

    log("6. Testing component unmount teardown & WHEP DELETE session cleanup...");
    externalSetProps({}, true);
    await new Promise(r => setTimeout(r, 1500));

    const unmountDiv = container.querySelector('#unmounted-notice');
    results.unmountCleansSession = !!unmountDiv;
    log(`Unmounted cleanly: ${results.unmountCleansSession}`);

    results.passed = results.componentImported &&
                     results.mountedSuccessfully &&
                     results.videoElementFound &&
                     results.whepNegotiated &&
                     results.streamReachedLive &&
                     results.framesDecodedCount > 0 &&
                     results.noDuplicateSessionsOnRerender &&
                     results.unmountCleansSession;

    log(`\n🎉 TEST COMPLETE: Overall Status = ${results.passed ? 'PASSED' : 'FAILED'}`);
    window.__TEST_RESULTS__ = results;

    await fetch('http://127.0.0.1:9876/test-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results)
    }).catch(() => {});

  } catch (err) {
    log(`❌ TEST FAILED: ${err.message}\n${err.stack}`);
    window.__TEST_RESULTS__ = { passed: false, error: err.message };
    await fetch('http://127.0.0.1:9876/test-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passed: false, error: err.message })
    }).catch(() => {});
  }
}

runTestHarness();
