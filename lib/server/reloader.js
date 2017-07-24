// =============================================================================
// The script below is dynamically injected by Martinet in order to
// automatically trigger a page refresh when your source project is rebuilt.
//
// Your source files have not been modified on disk.
// The code below will not be present when Martinet is run in "prod" configuration.
// =============================================================================
/* eslint-disable */
function __Martinet__Reloader() {
  var lastBuildId, curtainElem;
  (function reconnect() {
    var location = window.location;
    var url = location.origin.replace(/^http/, 'ws') + '/__martinet__/ws';
    var websocket = new WebSocket(url);
    websocket.onmessage = function(message) {
      const buildState = JSON.parse(message.data);

      if (buildState.status === 'error') {
        const newLocation = (
            '/__martinet__/status/?bounceBack=' +
            encodeURIComponent(location.href));
        location.href = location.origin + newLocation;
        return;
      }

      if (buildState.status === 'building') {
        if (!curtainElem) {
          curtainElem = document.createElement('div');
          curtainElem.style.position = 'fixed';
          curtainElem.style.left = 0;
          curtainElem.style.top = 0;
          curtainElem.style.width = '100%';
          curtainElem.style.height = '100vh';
          curtainElem.style['font-size'] = '22px';
          curtainElem.style['background-color'] = 'white';
          curtainElem.style['opacity'] = 0.9;
          curtainElem.style['text-align'] = 'center';
          curtainElem.style['font-weight'] = 700;
          curtainElem.style['padding-top'] = '25%';
          curtainElem.style['z-index'] = 16777271;
          curtainElem.textContent = 'Building...';
          document.body.appendChild(curtainElem);
        }
        return;
      }

      if (buildState.buildId) {
        if (curtainElem) {
          curtainElem.remove();
          curtainElem = null;
        }
        if (!lastBuildId) {
          lastBuildId = buildState.buildId;
          console.log('Martinet: current build ID is', lastBuildId);
        } else {
          if (lastBuildId !== buildState.buildId) {
            return location.reload(true);
          }
        }
      }
    };
    websocket.onclose = function(error) {
      setTimeout(reconnect, 750);
    };
    websocket.addEventListener('open', function() {
      console.log(
          'Martinet: auto-refreshing this window on source changes.');
      try {
        var saved = JSON.parse(
            window.localStorage.getItem('__martinet__'));
        window.scrollTo(saved.scrollX, saved.scrollY);
        console.log('Martinet: restored scroll position to',
            '(' + saved.scrollX + ', ' + saved.scrollY + ')');
      } catch(e) { }
    });
    window.onbeforeunload = function() {
      var saved = JSON.stringify({
        scrollX: window.scrollX || 0,
        scrollY: window.scrollY || 0
      });
      try {
        window.localStorage.setItem('__martinet__', saved);
      } catch(e) {
        console.error('Martinet:', e);
      }
    };
  })();
}
document.addEventListener('DOMContentLoaded', __Martinet__Reloader);
// =============================================================================
// The script above is dynamically injected by Martinet.
// =============================================================================
