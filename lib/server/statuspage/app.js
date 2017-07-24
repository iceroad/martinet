/* eslint-disable */
var STATUS;


function CreateNewSocket($scope, $location) {
  const wsUrl = window.location.origin.replace(/^http/, 'ws') + '/__martinet__/ws';
  const bounceBackUrl = $location.search().bounceBack;

  if ($scope.$ws) {
    try {
      $scope.$ws.close();
    } catch (e) {
      console.error(e);
    }
  }
  var ws = $scope.$ws = new WebSocket(wsUrl);

  ws.addEventListener('open', function() {
    CreateNewSocket.backoffMs = 150;
  });

  ws.addEventListener('message', function(msgEvt) {
    const msgData = JSON.parse(msgEvt.data);

    if (msgData.status === 'done' && bounceBackUrl) {
      window.location.href = decodeURIComponent(bounceBackUrl);
      return;
    }

    setTimeout(function() {
      $scope.$apply(function() {
        $scope.state = msgData;
        STATUS = msgData;
      });
    }, 50);

    // Bounce back to previous page if URL parameter is set and build is OK.
    //if (msgData.status === 'done' && )
  });

  ws.addEventListener('close', function() {
    var nbf = CreateNewSocket.backoffMs;
    CreateNewSocket.backoffMs = nbf = Math.min(nbf * 2, 5000);
    console.log('Connection dropped, trying again in', nbf);
    setTimeout(function() { CreateNewSocket($scope); }, nbf);
  });
}


function MainCtrl($scope, $location) {
  CreateNewSocket.backoffMs = 150;
  CreateNewSocket($scope, $location);
}


MainCtrl.prototype.setPageDetail = function(pageDist) {
  try {
    this.pageDetails = STATUS.build.pageStates[pageDist];
  } catch (e) {
    console.warn(e);
    return;
  }
};


angular
  .module('app', [])
  .config(function($locationProvider) {
    $locationProvider.html5Mode({
      enabled: true,
      requireBase: false
    });
  })
  .controller('MainCtrl', MainCtrl);
