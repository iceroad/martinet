/* eslint-disable */
angular
  .module('app', [])
  .controller('MainCtrl', function($scope) {

    var nextBackoffInterval = 150;

    function CreateNewSocket() {
      console.log('Establishing connection...');
      var ws = $scope.$ws = new WebSocket(
          window.location.origin.replace(/^http/, 'ws') + '/__dev__/ws');
      ws.addEventListener('message', function(msgEvt) {
        var buildState = JSON.parse(msgEvt.data);
        $scope.$apply(function() {
          $scope.buildState = buildState;
        });
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
