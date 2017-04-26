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

    function CreateNewSocket() {
      console.log('Establishing connection...');
      var ws = $scope.$ws = new WebSocket(
          window.location.origin.replace(/^http/, 'ws') + '/__dev__/ws');
      ws.addEventListener('message', function(msgEvt) {
        var buildState = JSON.parse(msgEvt.data);
        $scope.$apply(function() {
          $scope.buildState = buildState;
        });

        if (buildState.status === 'ok' && params.error === 'build' && params.url) {
          // Bounce back to the original page.
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
