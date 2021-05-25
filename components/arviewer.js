        
import ARCS from '../build/arcs.js';
import * as THREE from '../deps/three.js/index.js';
import FrustumCamera from '../deps/three.js/frustumcamera.js';
        
var ARViewer;

/** 
    * @class ARViewer 
    * @classdesc Simple compositing viewer for augmented reality
    */        
ARViewer = ARCS.Component.create(
    /** @lends ARViewer.prototype */
    function () {
        var container, sourceAspectRatio, sourceHeight;
    
        var renderer, scene2d, scene3d, camera2d, camera3d, videoSource, videoTexture;
        
        var aspectRatioKept = true;
        
        var sceneId;
        
        
        // scenegraph initializations
        scene2d = new THREE.Scene();
        camera2d = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5);
        scene2d.add(camera2d);
        
        scene3d = new THREE.Scene();

        /**
            * Initializes the widgets (HTML elements) needed as a basis 
            * for the viewer.
            * @param cName {string} id of the container that will enclose the scene renderer
            * @param vName {string} id of the element at the source of the video stream
            * @slot
            * @function ARViewer#setWidgets
            */
        this.setWidgets = function(cName,vName) {
            container = document.getElementById(cName);
            videoSource = document.getElementById(vName);
            var containerStyle = window.getComputedStyle(container);
            var videoStyle = window.getComputedStyle(videoSource);
            sourceAspectRatio = parseInt(videoStyle.width) / parseInt(videoStyle.height);
            sourceHeight = parseInt(videoStyle.height);
            
            container.width = parseInt(containerStyle.width);
            container.height = parseInt(containerStyle.height);

            renderer = new THREE.WebGLRenderer();
            renderer.setClearColor(0x000000, 1);
            renderer.setSize(container.width, container.height);
            container.appendChild(renderer.domElement);

            var theta = 45; //2*Math.atan2(container.height/2,focalLength)*180/3.14159265;
            camera3d = new THREE.PerspectiveCamera(theta, container.width / container.height, 0.01, 10000);
            scene3d.add(camera3d);

            var _light = new THREE.DirectionalLight(0xffffff);
            _light.position.set(0,5,5);

            scene3d.add(_light);
            
            if ( THREE.VideoTexture !== undefined) {
                console.log("Using video texture since it is available");
                videoTexture = new THREE.VideoTexture(videoSource);
            } else {
                console.log("Falling back on simple texture");
                videoTexture = new THREE.Texture(videoSource);
            }
            var geometry = new THREE.PlaneGeometry(1.0, 1.0);
            var material = new THREE.MeshBasicMaterial( {map: videoTexture, depthTest: false, depthWrite: false} );
            var mesh = new THREE.Mesh(geometry, material);
            var textureObject = new THREE.Object3D();
            textureObject.position.z = -1;
            textureObject.add(mesh);
            scene2d.add(textureObject);
            
            updateAspectRatio();
        };

        /**
            * Set the focal length of the virtual camera for very simple 
            * camera models.
            * @param focal {numeric} focal length (in pixels) of the camera.
            * @slot
            * @function ARViewer#setFocal
            */
        this.setFocal = function (focal) {
            var theta = 2*Math.atan(0.5*sourceHeight/focal)*180/Math.PI;
            camera3d.fov = theta;
            console.log(theta);
            //camera3d.updateProjectionMatrix();
            updateAspectRatio();
        };
    
        
        /**
            * Set intrinsic camera parameters for the virtual camera
            * @param intrinsics {array} linearized array of camera parameters
            * @slot
            * @function ARViewer#setIntrinsics
            */                
        this.setIntrinsics = function (parameters) {
            /* TODO #3 set here the intrinsic parameters of camera3d
                *  camera3d should be of type THREE.FrustumCamera
                * you should frustum accordingly to intrinsic parameters
                */
            
            // camera3d = new THREE.FrustumCamera( left, right, bottom, top, near, far ) ;
            let near = camera3d.near;
            let far = camera3d.far;
            let width = sourceHeight*sourceAspectRatio;
            let height = sourceHeight;
            let left = - near / parameters[0] * parameters[2];
            let right = near / parameters[0] * ( width - parameters[2]);
            let bottom = - near / parameters[4] * parameters[5];
            let top = near / parameters[4] * (height - parameters[5]);
            
            
            camera3d = new FrustumCamera( left, right, bottom, top, near, far );
            
        };
        
        
        /**
        * Set extrinsic camera parameters for the virtual camera
        * @param markers {array} an array of markers 
        * @slot
        * @function ARViewer#setExtrinsics
        */
        this.setExtrinsics = function (markers) {
            var i ;
            for ( i = 0; i < markers.length; i++) {
                if ( markers[i].id === sceneId ) {
                    /* TODO #2 set here the extrinsic parameters of camera3d
                        * Each marker has 3 major properties :
                        * - id is the marker id;
                        * - pose.rotation gives its orientation using a rotation matrix
                        *   and is a 3x3 array
                        * - pose.position gives its position with respect to the camera
                        *   and is a vector with 3 components.
                        * 
                        * put here the code to set orientation and position of object camera3d
                        * see also documentation of Object3D (API Three.js)
                        * since a camera is an Object3D
                        */
                        let R = markers[i].pose.rotation;
                        let t = markers[i].pose.position;
                        let mat = new THREE.Matrix4();
                        mat.set( 
                            R[0][0], R[0][1], R[0][2], t[0],
                            R[1][0], R[1][1], R[1][2], t[1],
                            R[2][0], R[2][1], R[2][2], t[2],
                            0, 0, 0, 1
                        );
                        let inverse = new THREE.Matrix4();
                        console.log(mat);
                        inverse.getInverse(mat);
                        
                        camera3d.position.x = inverse.elements[12];
                        camera3d.position.y = inverse.elements[13];
                        camera3d.position.z = inverse.elements[14];

                        camera3d.setRotationFromMatrix(inverse);
                        console.log(camera3d.position);
                    
                    
                }
            }
            
            
        };
        
        /**
            * Set the scene id in case we should set extrinsic parameters.
            * @param id {number} the id of the scene
            * @function ARViewer#setSceneId
            * @slot
            */
        this.setSceneId = function (id) {
            sceneId = id;                    
        };
        
        /**
            * Sets the size of the viewport in pixels to render the scene
            * @param width {number} width of the viewport
            * @param height {number} height of the viewport
            * @slot
            * @function ARViewer#setSize
            */
        this.setSize = function(width, height) {
            var W = width|0;
            var H = height|0;
            
            container.width = width;
            container.height = height;
            renderer.setSize(W,H);

            updateAspectRatio();
        };
    
        /** 
            * Tells to keep the aspect ratio of the camera. 
            * It avoids deformations of the augmented scene.
            * @param b {boolean} set it to <tt>true</tt> to keep aspect ratio, <tt>false</tt> otherwise
            * @slot
            * @function ARViewer#keepAspectRatio
            */
        this.keepAspectRatio = function (b) {
            aspectRatioKept = b;
        };
        
        var updateAspectRatio = function () {
            var cAspectRatio = container.width / container.height;
            var actualWidth, actualHeight;
            var xoff, yoff;
            
            if (aspectRatioKept == true) {
                // cameras have the source aspect ratio
                camera2d.aspect = sourceAspectRatio;
                camera2d.updateProjectionMatrix();
                camera3d.aspect = sourceAspectRatio;
                camera3d.updateProjectionMatrix();
                // then, we should adjust viewport accordingly.
                if (cAspectRatio > sourceAspectRatio) {
                    actualHeight = container.height;
                    actualWidth = actualHeight * sourceAspectRatio; 
                } else {
                    actualWidth = container.width;
                    actualHeight = actualWidth / sourceAspectRatio;
                }
                
                xoff = (container.width - actualWidth) / 2 ;
                yoff = (container.height - actualHeight) / 2;                        
                renderer.setViewport(xoff, yoff, actualWidth, actualHeight);
            } else {
                // for 3D camera, we will have to recompute the actual
                // aspect ratio.
                
                // but first reset viewport, just in case
                renderer.setViewport(0, 0, container.width, container.height);
                camera2d.aspect = cAspectRatio ;
                camera2d.updateProjectionMatrix();
                camera3d.aspect = sourceAspectRatio;  
                camera3d.updateProjectionMatrix();
                console.log(camera3d.projectionMatrix);
            }
            
        };
        
        /**
            * Adds new objects to the current 3D scene
            * @param scene {object} 3D object as defined by Three.js to add to the scene.
            * @slot
            * @function ARViewer#addScene
            */
        this.addScene = function (scene) {
            scene3d.add(scene);
        };
    
        /**
            * Removes an object from the current 3D scene
            * @param scene {object} 3D object as defined by Three.js to remove from the scene.
            * @slot
            * @function ARViewer#removeScene
            */
        this.removeScene = function (scene) {
            scene3d.remove(scene);
        };
        
        /**
            * Triggers the rendering of the composite scene
            * @function ARViewer#render
            * @slot
            */
        this.render = function () {
            videoTexture.needsUpdate = true;
            renderer.autoClear = false;
            renderer.clear();
            renderer.render(scene2d, camera2d);
            renderer.render(scene3d, camera3d);
        };
        
        /**
            * Computes the ideal camera position to see the whole 3D scene.
            * Mainly useful for debugging
            * @function ARViewer#viewAll
            * @slot
            */                
        this.viewAll = function () {
            var box = new THREE.Box3();                    
            box.setFromObject(scene3d);
            var center = box.getCenter();
            var sphere = new THREE.Sphere();
            box.getBoundingSphere(sphere);
            var radius = sphere.radius;
            
            camera3d.position.x = center.x ;
            camera3d.position.y = center.y ;
            var c = Math.cos(camera3d.fov/2);
            var s = Math.sin(camera3d.fov/2);
            
            camera3d.position.z = center.z + 1.2 * radius*s*( 1 + s / c ) ;
        };
        
        /**
            * Resets the position of the camera to the origin of the scene coordinate system
            * @slot
            * @function ARViewer#resetCamera
            */                
        this.resetCamera = function () {
            camera3d.position.x = camera3d.position.y = camera3d.position.z = 0;
            camera3d.up = THREE.Object3D.DefaultUp.clone();
        }
    
    },
    /** @lends ARViewer.slots */
    [
        'setWidgets','setFocal','viewAll','setSize','addScene',
        'resetCamera','removeScene','render','keepAspectRatio',
        'setExtrinsics', 'setIntrinsics'
        
    ],
    []
);

export default {ARViewer: ARViewer}; 

