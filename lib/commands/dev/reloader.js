// =============================================================================
// The script below is dynamically injected by Martinet in order to
// automatically trigger a page refresh when your source project is rebuilt.
//
// Your source files have not been modified on disk.
// The code below will not be present when Martinet is run in "prod" configuration.
// =============================================================================
/* eslint-disable */
function __Martinet__Reloader() {
  var lastBuildId;
  (function reconnect() {
    var location = window.location;
    var url = location.origin.replace(/^http/, 'ws') + '/__dev__/ws';
    var websocket = new WebSocket(url);
    websocket.onmessage = function(message) {
      const buildState = JSON.parse(message.data);
      if (buildState.status === 'fail') {
        const newLocation = '/__dev__/status/?error=build&url=' + encodeURIComponent(location.href);
        location.href = location.origin + newLocation;
        return;
      }
      if (buildState.buildId) {
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
