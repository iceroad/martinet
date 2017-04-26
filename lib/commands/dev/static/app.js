/* eslint-disable */
angular
  .module('app', [])
  .controller('MainCtrl', function($scope) {

    var nextBackoffInterval = 150;

    var searchParams = (window.location.search || '').substr(1).split('&');
    var params = {};
    for (var i = 0; i < searchParams.length; i++) {
      var paramPair = searchParams[i].split('=');
      params[paramPair[0]] = decodeURIComponent(paramPair[1]);
    }
    $scope.params = params;

    // Maintain a separate array for page-specific information panels.
    var showPageInfo = {};
    $scope.showPageInfo = showPageInfo;

    function CreateNewSocket() {
      console.log('Establishing connection...');
      var ws = $scope.$ws = new WebSocket(
          window.location.origin.replace(/^http/, 'ws') + '/__dev__/ws');
      ws.addEventListener('message', function(msgEvt) {
        // Have a new buildState, run post-processors.
        var buildState = JSON.parse(msgEvt.data);

        buildState.pages.forEach(function(pageDef, idx) {
          var pageId = pageDef.outputRelPath;
          showPageInfo[pageId] = (pageDef.errors.length || pageDef.warnings.length);
        });

        $scope.$apply(function() {
          $scope.buildState = buildState;
        });

        // Bounce back to the original page when a broken build is fixed.
        if (buildState.status === 'ok' && params.error === 'build' && params.url) {
          window.location.href = params.url;
          return;
        }
      });

      ws.addEventListener('close', function() {
        console.log('Connection dropped.');
        nextBackoffInterval = Math.min(nextBackoffInterval * 2, 5000);
        setTimeout(CreateNewSocket, nextBackoffInterval);
      });

      ws.addEventListener('open', function() {
        nextBackoffInterval = 150;
        console.log('Connection opened.');
      });
    }

    CreateNewSocket();

  });
