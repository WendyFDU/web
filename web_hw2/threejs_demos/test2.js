var renderer;
  function initThree() {
    width = document.getElementById('canvas-frame').clientWidth;
    height = document.getElementById('canvas-frame').clientHeight; 
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(width, height );
    document.getElementById('canvas-frame').appendChild(renderer.domElement);
    renderer.setClearColor(0xFFFFFF, 1.0);
    renderer.shadowMap.enabled = true;
  }
 
  var camera;
  function initCamera() { 
    camera = new THREE.PerspectiveCamera( 45 , width / height , 1 , 10000 );
    camera.position.x = 100;
    camera.position.y = 20;
    camera.position.z = 50;
    camera.up.x = 0;
    camera.up.y = 0;
    camera.up.z = 1;
    camera.lookAt( {x:0, y:0, z:0 } );
  }
  var scene;
  function initScene() {   
    scene = new THREE.Scene();
  }
  var light;
  function initLight() { 
    light = new THREE.DirectionalLight(0xFF0000, 1.0, 0);
    light.position.set( 100, 100, 200 );
    light.castShadow = true;
    scene.add(light);

  }
  var cube;
  var plane;
  function initObject(){  
    cube = new THREE.Mesh(
         new THREE.CubeGeometry(50,50,50),                //形状の設定
         new THREE.MeshLambertMaterial({color: 0xff0000}) //材質の設定
    );
    scene.add(cube);
    cube.position.set(0,0,0);
    plane = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),                
    new THREE.MeshLambertMaterial({color: 0x0000ff})
    );
    scene.add(plane);
    plane.position.set(0,50,0); 
    cube.castShadow = true;  
    plane.receiveShadow = true; 
  }
  function threeStart() {
    initThree();
    initCamera();
    initScene();   
    initLight();
    initObject();
    renderer.clear(); 
    renderer.render(scene, camera);
  }