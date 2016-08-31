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
    })    .
    controller('DetailController', function (iRoadModal, $scope,$uibModal,$uibModalInstance,program,event,$log) {
        $scope.loading = true;
        $scope.program = program;

        iRoadModal.getRelations(event).then(function(newEvent){
            $scope.event = newEvent;
            $scope.loading = false;
        });

        $scope.ok = function () {
            $uibModalInstance.close($scope.event);
        };

        $scope.cancel = function () {
            $uibModalInstance.close($scope.event);
        };

        /**
         * viewRelationData
         * @param relationName
         * @param event
         */
        $scope.viewRelationData = function(relationName){
            iRoadModal.getProgramByName(relationName).then(function(program){
                iRoadModal.getRelationshipDataElementByProgram(iRoadModal.refferencePrefix + $scope.program.displayName,program).then(function(dataElement){

                    console.log(program.id,dataElement.id,$scope.event.event);

                    iRoadModal.find(program.id,dataElement.id,$scope.event.event).then(function(events){
                        var modalInstance = $uibModal.open({
                            animation: $scope.animationsEnabled,
                            templateUrl: 'views/viewRelation.html',
                            controller: 'viewRelationController',
                            size: "md",
                            resolve: {
                                events: function () {
                                    return events;
                                },
                                program:function(){
                                    return program;
                                },
                                mode : function(){
                                    return 'view';
                                }

                            }
                        });
                        modalInstance.result.then(function () {
                            $log.info('Relation Modal dismissed at: ' + new Date());
                        }, function () {
                            $log.info('Relation Modal dismissed at: ' + new Date());
                        });
                    });
                });
            });
        };
    })
    .controller('viewRelationController', function (iRoadModal,NgTableParams,$scope,$uibModalInstance,program,events,mode) {

        $scope.loading = true;
        $scope.events = [];
        $scope.program = program;
        $scope.tableParams = new NgTableParams();

        $scope.tableCols = createColumns(program.programStages[0].programStageDataElements);
        if(events.length == 0){
            $scope.loading = false;
        }
        events.forEach(function(event){
            iRoadModal.getRelations(event).then(function(newEvent){
                $scope.events.push(newEvent);
                if(events.length == $scope.events.length){
                    $scope.tableParams.settings({
                        dataset: events
                    });
                    $scope.loading = false;
                }
            });
        });

        /**
         * createColumns
         * @param programStageDataElements
         * @returns {Array}
         */
        function createColumns(programStageDataElements) {
            var cols = [];
            if (programStageDataElements){
                programStageDataElements.forEach(function (programStageDataElement) {
                    var filter = {};
                    filter[programStageDataElement.dataElement.name.replace(" ","")] = 'text';
                    cols.push({
                        field: programStageDataElement.dataElement.name.replace(" ",""),
                        title: programStageDataElement.dataElement.name,
                        headerTitle: programStageDataElement.dataElement.name,
                        show: programStageDataElement.displayInReports,
                        sortable: programStageDataElement.dataElement.name.replace(" ",""),
                        filter: filter
                    });
                })
            }
            if(mode == "addOrEdit"){
                cols.push({
                    field: "",
                    title: "Action",
                    headerTitle: "Action",
                    show: true
                });
            }
            return cols;
        }

        $scope.ok = function () {
            $uibModalInstance.close();
        };

        $scope.cancel = function () {
            $uibModalInstance.close();
        };
    });
