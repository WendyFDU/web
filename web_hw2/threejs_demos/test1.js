var renderer;
  function initThree() {
    width = document.getElementById('canvas-frame').clientWidth;
    height = document.getElementById('canvas-frame').clientHeight; 
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(width, height );
    document.getElementById('canvas-frame').appendChild(renderer.domElement);
    renderer.setClearColor(0xFFFFFF, 1.0);
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
    light = new THREE.DirectionalLight(0xFFFFFF, 1.0, 0);
    light.position.set( 100, 100, 200 );
    scene.add(light);
  }
  var cube;
  var v = 0;
  var a = -0.1;
  var isMoving = false;
  function drop(){
      isMoving = true;
      ball.position.y = maxHeight;
      v = 0;
  }
  function draw(){
    stat.begin();
    if(isMoving){
      ball.position.y+=v;
      if(ball.position.y<=5){
        v = -v*0.9;
      }
      if(Math.abs(v)<0.001){
        isMoving = false;
        ball.position.y = 5;

      }
    }
    renderer.render(scene,camera);
    stat.end();
  }
  function initObject(){  
    cube = new THREE.Mesh(
         new THREE.CubeGeometry(20,20,20),                //形状の設定
         new THREE.MeshLambertMaterial({color: 0xff0000}) //材質の設定
    );
    // scene.add(cube);
    cube.position.set(0,0,0);

    ball = new THREE.Mesh(new THREE.SphereGeometry(5,16,8),new THREE.MeshLambertMaterial({color: 0xff0000}));
      ball.position.z = 5;
      scene.add(ball);
      plane = new THREE.Mesh(new THREE.PlaneGeometry(100,50),new THREE.MeshLambertMaterial({color: 0xFFFFFF}));
      // plane.rotation.x = -Math.PI/2;
      scene.add(plane);
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