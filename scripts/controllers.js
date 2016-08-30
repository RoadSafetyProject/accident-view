/* global angular */

'use strict';

/* Controllers */
var appControllers = angular.module('appControllers', ['iroad-relation-modal'])

    .controller('MainController', function (NgTableParams,iRoadModal, $scope,$uibModal,$log,$interval,$timeout) {
        //$scope.offenceEvent = iRoadModal("Offence Event");
        var latitude = -6.3690;
        var longitude = 34.8888;
        angular.extend($scope, {
            center: {
                lat: latitude,
                lng: longitude,
                zoom: 3
            }, events: {
                map: {
                    enable: ['zoomstart', 'drag', 'click', 'mousemove'],
                    logic: 'emit'
                }
            }
        });
        $scope.markers = {};
        $scope.programName = "Accident";
        $scope.getAccidents = function(){
            iRoadModal.getAll($scope.programName,$scope.params).then(function(results){
                results.forEach(function(event){
                    if(!$scope.markers[event.event]){
                        $scope.markers[event.event] = {
                            lat: event.coordinate.latitude,
                            lng: event.coordinate.longitude,
                            event:event,
                            interval:$interval((function(eventId){
                                return function(){
                                    if($scope.markers[eventId].opacity == 0){
                                        $scope.markers[eventId].opacity = 1;
                                    }else{
                                        $scope.markers[eventId].opacity = 0;
                                    }
                                }
                            })(event.event), 1000)
                        }
                    }
                })
            })
        };
        $scope.$on('leafletDirectiveMarker.click', function (event, marker) {
            $interval.cancel(marker.model.interval);
            $scope.showDetails(marker.model.event,marker);
        });
        iRoadModal.getProgramByName($scope.programName).then(function(program) {
            $scope.program = program;
            $interval($scope.getAccidents, 1000);
        });
        $scope.showDetails = function(event,marker){
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'views/details.html',
                controller: 'DetailController',
                size: "sm",
                resolve: {
                    event: function () {
                        return event;
                    },
                    program:function(){
                        return $scope.program;
                    }
                }
            });

            modalInstance.result.then(function (resultItem) {
                $scope.markers[event.event].opacity = 1;
                iRoadModal.setRelations(event).then(function(){

                });
            }, function () {
                iRoadModal.setRelations(event).then(function(){

                });
                $log.info('Modal dismissed at: ' + new Date());
            });
        }
        $scope.showEdit = function(event){
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'views/addedit.html',
                controller: 'EditController',
                size: "lg",
                resolve: {
                    event: function () {
                        return event;
                    },
                    program:function(){
                        return $scope.program;
                    }
                }
            });

            modalInstance.result.then(function (resultEvent) {
                $scope.tableParams.data.forEach(function(event){
                    if(event.event == resultEvent.event){
                        Object.keys(event).forEach(function(key){
                            event[key] = resultEvent[key];
                        })

                    }
                })
                $scope.tableParams.reload();
            }, function () {
                iRoadModal.setRelations(event).then(function(){

                });
                $log.info('Modal dismissed at: ' + new Date());
            });
        }
        $scope.showAddNew = function(){
            var event = {};
            var modalInstance = $uibModal.open({
                animation: $scope.animationsEnabled,
                templateUrl: 'views/addedit.html',
                controller: 'EditController',
                size: "lg",
                resolve: {
                    event: function () {
                        return event;
                    },
                    program:function(){
                        return $scope.program;
                    }
                }
            });

            modalInstance.result.then(function (resultEvent) {
                $scope.tableParams.data.push(resultEvent);
            }, function () {

            });
        }
    })
    .controller('DetailController', function (iRoadModal, $scope,$uibModalInstance,program,event) {
        $scope.loading = true;
        iRoadModal.getRelations(event).then(function(newEvent){
            $scope.event = newEvent;
            $scope.loading = false;
        })
        $scope.program = program;
        $scope.ok = function () {
            $uibModalInstance.close({});
        };

        $scope.cancel = function () {
            $uibModalInstance.dismiss('cancel');
        };
    })
    .controller('EditController', function (NgTableParams,iRoadModal, $scope,$uibModalInstance,program,event,$uibModal) {
        $scope.program = program;
        iRoadModal.initiateEvent(event,program).then(function(newEvent){
            $scope.event = newEvent;
            $scope.loading = false;
            $scope.getDataElementIndex = function(dataElement){
                var index = "";
                $scope.event.dataValues.forEach(function(dataValue,i){
                    if(dataValue.dataElement == dataElement.id){
                        index = i;
                    }
                })
                return index;
            }
        })
        $scope.save = function () {
            $scope.loading = true;
            console.log($scope.event);
            iRoadModal.save($scope.event,$scope.program).then(function(result){
                $scope.loading = false;
                $uibModalInstance.close(result);
            },function(error){
                $scope.loading = false;
            });
        };

        $scope.cancel = function () {
            iRoadModal.setRelations($scope.event).then(function(){
                $uibModalInstance.dismiss('cancel');
            })
        };
    })
