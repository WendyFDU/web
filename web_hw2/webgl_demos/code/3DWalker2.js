//################################################################
//    texture shader
//################################################################
// Vertex shader program
var VSHADER_TEXTURE_SOURCE = 
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Normal;\n' +
  'attribute vec2 a_TexCoord;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_pPosition;\n' +
  'varying vec4 v_Color;\n' +

  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  // point light
  '  v_pPosition = vec3(u_ModelMatrix * a_Position);\n' +
  '  v_TexCoord = a_TexCoord;\n' +
  '}\n';

// Fragment shader program
var FSHADER_TEXTURE_SOURCE =
  'precision mediump float;\n' +
  'uniform sampler2D u_Sampler;\n' +

  'uniform vec3 u_AmbientLight;\n' + 
  'uniform vec3 u_LightPosition;\n' +
  'uniform vec3 u_PointLightColor;\n' +
  'uniform vec3 u_DirectionLight;\n' +

  'varying vec3 v_Normal;\n' +
  'varying vec3 v_pPosition;\n' +
  'varying vec2 v_TexCoord;\n' +
  
  'uniform bool isPointLightOn;\n' +
  'void main() {\n' +
  '  vec4 color = texture2D(u_Sampler, v_TexCoord);\n' +
  '  vec3 normal = normalize(v_Normal);\n' +
  // para
  '  float nDotL = max(dot(normal, u_DirectionLight), 0.0);\n' +
  '  vec3 diffuse = nDotL * color.rgb;\n' +
  '  vec3 ambient = u_AmbientLight * color.rgb;\n' +  
  // point
  '  vec3 pointLightDirection = normalize(u_LightPosition - v_pPosition);\n' +
  '  float pnDotL = max(dot(pointLightDirection, normal), 0.0);\n' +
  '  vec3 pdiffuse = u_PointLightColor * pnDotL * color.rgb;\n' +
  '  vec3 lightColor = diffuse + ambient;\n' +  
  '  if (isPointLightOn){\n' +  
  '     lightColor += pdiffuse;\n' +  
  '  }\n' +  
  
  '  gl_FragColor = vec4(lightColor, color.a);\n' +
  '}\n';

//################################################################
//    light shader
//################################################################
// Vertex shader program
var VSHADER_LIGHT2_SOURCE = 
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +

  'varying vec3 v_Normal;\n' +
  'varying vec3 v_pPosition;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  // point light
  '  v_pPosition = vec3(u_ModelMatrix * a_Position);\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program
var FSHADER_LIGHT2_SOURCE =
  'precision mediump float;\n' +
  'uniform vec3 u_AmbientLight;\n' + 
  'uniform vec3 u_LightPosition;\n' +
  'uniform vec3 u_PointLightColor;\n' +
  'uniform vec3 u_DirectionLight;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_pPosition;\n' +
  'varying vec4 v_Color;\n' +
  'uniform bool isPointLightOn;\n' +
  'void main() {\n' +
  '  vec3 normal = normalize(v_Normal);\n' +
  // para
  '  float nDotL = max(dot(normal, u_DirectionLight), 0.0);\n' +
  '  vec3 diffuse = v_Color.rgb * nDotL;\n' +
  '  vec3 ambient = u_AmbientLight * v_Color.rgb;\n' +  
  // point
  '  vec3 pointLightDirection = normalize(u_LightPosition - v_pPosition);\n' +
  '  float pnDotL = max(dot(pointLightDirection, normal), 0.0);\n' +
  '  vec3 pdiffuse = u_PointLightColor * v_Color.rgb * pnDotL;\n' +
  '  vec3 lightColor = diffuse + ambient;\n' +  
  '  if (isPointLightOn){\n' +  
  '     lightColor += pdiffuse;\n' +  
  '  }\n' +  
  '  gl_FragColor = vec4(lightColor, v_Color.a);\n' +
  '}\n';  

var canvas;
var gl;

//shaders program
var textureProgram;
var light2Program;

//相机位置
var eye = new Vector3(CameraPara.eye);
var at = new Vector3(CameraPara.at);
var up = new Vector3(CameraPara.up);
var dir = VectorMinus(at, eye); // eye direction

var SceneObjectList = [];

var SceneObject = function() {
  this.model;    //a model contains some vertex buffer
  this.filePath;   //obj file path
  this.objDoc;
  this.drawingInfo;
  this.transform;
  this.valid = 0;
}

var TexObjectList = [];
var FLOORFLAG = 0;
var BOXFLAG = 1;
var TexObject = function() {
  this.model;    //a model contains some vertex buffer
  this.texture;  // texture
  this.drawingInfo;
};

var dbgmsg = "";
var isPointLightOn = false; // whether the point light is on or not

// global var for camera motion
var isCarmLeftOn = false; // A ←
var isCarmRightOn = false; // D →
var isCarmUpOn = false; // W ↑
var isCarmDownOn = false; // S ↓
var isCarmRotLOn = false; // J ←
var isCarmRotROn = false; // L →
var isCarmRotUOn = false; // I ↑
var isCarmRotDOn = false; // K ↓

//################################################################
//    绘制所有模型
//################################################################
function renderScene(){
  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // Enable depth test
  gl.enable(gl.DEPTH_TEST);

  var viewMatrix = new Matrix4();  // View matrix
  var projMatrix = new Matrix4();  // Projection matrix

  viewMatrix.setLookAt(eye.elements[0],eye.elements[1],eye.elements[2],
            at.elements[0],at.elements[1],at.elements[2],
            up.elements[0],up.elements[1],up.elements[2]
            );

  projMatrix.setPerspective(CameraPara.fov, canvas.width/canvas.height, 
                CameraPara.near, CameraPara.far);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // render light Scece and texture Scene
  renderLightScene(gl, light2Program, viewMatrix, projMatrix);
  renderTexScene(gl, textureProgram, viewMatrix, projMatrix);
  
}
// Coordinate transformation matrix
var modelMatrix = new Matrix4(); // Model matrix
var mvpMatrix = new Matrix4();   // Model view projection matrix
var normalMatrix = new Matrix4();
// render the complex model
function renderLightScene(gl, program, viewMatrix, projMatrix){
  gl.useProgram(program);

  // initialize the variable about light
  gl.uniform3f(program.u_DirectionLight, sceneDirectionLight[0], sceneDirectionLight[1], sceneDirectionLight[2]);
  gl.uniform3f(program.u_AmbientLight, sceneAmbientLight[0], sceneAmbientLight[1], sceneAmbientLight[2]);
  gl.uniform3f(program.u_LightPosition, eye.elements[0], eye.elements[1], eye.elements[2]);
  gl.uniform3f(program.u_PointLightColor, scenePointLightColor[0], scenePointLightColor[1], scenePointLightColor[2]);

  // draw each SceneObject 
  for(i = 0; i < SceneObjectList.length; i++){
    var so = SceneObjectList[i];
    if (so.objDoc != null && so.objDoc.isMTLComplete()){ // OBJ and all MTLs are available
      so.drawingInfo = onReadComplete(gl, so.model, so.objDoc);
      SceneObjectList[i].objname = so.objDoc.objects[0].name;
      so.objname = so.objDoc.objects[0].name;
      so.objDoc = null;
    }
    if (so.drawingInfo){
      // initialize the model matrix
      modelMatrix.setIdentity();    
      if (i == 1){ // if the model is bird
        var gumby = ObjectList[SceneObjectList.length-1].transform;
        var bird = ObjectList[i].transform;
        // set the bird at gumby's position
        modelMatrix.translate(gumby[0].content[0], gumby[0].content[1], gumby[0].content[2]);
        modelMatrix.scale(bird[1].content[0], bird[1].content[1], bird[1].content[2]);
        // let the bird fly
        drawFlyingbird(modelMatrix);
      } else{ // for other model
        var transTypes = ObjectList[i].transform.length;
        for (var m = 0; m < transTypes; m++){ // initialize all the transform for this model
          initModelMatrix(modelMatrix, ObjectList[i].transform, m);
        }
      }
      if (i == 0){ // if the model is star
        drawRotatingStart(modelMatrix);
      }
      gl.uniformMatrix4fv(program.u_ModelMatrix, false, modelMatrix.elements);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
      
      // initialize the normal Matrix
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements);
      
      // initialize all the attributes
      initAttributeVariable(gl, program.a_Position, so.model.vertexBuffer);  // Vertex coordinates
      initAttributeVariable(gl, program.a_Normal, so.model.normalBuffer);    // Normal
      initAttributeVariable(gl, program.a_Color, so.model.colorBuffer);      // color

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, so.model.indexBuffer);
      // Draw
      gl.drawElements(gl.TRIANGLES, so.drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
    } 
  }
}
// render the texture model
function renderTexScene(gl, program, viewMatrix, projMatrix){
  gl.useProgram(program);   // Tell that this program object is used

  // initialize the variable about light
  gl.uniform3f(program.u_DirectionLight, sceneDirectionLight[0], sceneDirectionLight[1], sceneDirectionLight[2]);
  gl.uniform3f(program.u_AmbientLight, sceneAmbientLight[0], sceneAmbientLight[1], sceneAmbientLight[2]);
  gl.uniform3f(program.u_LightPosition, eye.elements[0], eye.elements[1], eye.elements[2]);
  gl.uniform3f(program.u_PointLightColor, scenePointLightColor[0], scenePointLightColor[1], scenePointLightColor[2]);

  // draw each TexObject 
  for(i = 0; i < TexObjectList.length; i++){
    var to = TexObjectList[i];
    // initialize the infomation( texCoord, vertex, normal... )
    to.drawingInfo = readConfig(gl, to.model, i);
    if (to.drawingInfo){
      // initialize the model matrix
      modelMatrix.setIdentity();
      modelMatrix.translate(to.drawingInfo.translate[0], to.drawingInfo.translate[1], to.drawingInfo.translate[2]);
      modelMatrix.scale(to.drawingInfo.scale[0], to.drawingInfo.scale[1], to.drawingInfo.scale[2]);    
      
      gl.uniformMatrix4fv(program.u_ModelMatrix, false, modelMatrix.elements);

      mvpMatrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
      gl.uniformMatrix4fv(program.u_MvpMatrix, false, mvpMatrix.elements);
      
      // initialize the normal Matrix
      normalMatrix.setInverseOf(modelMatrix);
      normalMatrix.transpose();
      gl.uniformMatrix4fv(program.u_NormalMatrix, false, normalMatrix.elements);
      
      // initialize all the attributes
      initAttributeVariable(gl, program.a_Position, to.model.vertexBuffer);  // Vertex coordinates
      initAttributeVariable(gl, program.a_Normal, to.model.normalBuffer);    // Normal
      initAttributeVariable(gl, program.a_TexCoord, to.model.texCoordBuffer);// Texture coordinates
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, to.model.indexBuffer); // Bind indices
      // Bind texture object to texture unit
      if (i == 0){
        gl.activeTexture(gl.TEXTURE0);
      }
      else{
        gl.activeTexture(gl.TEXTURE1);
      }
      // assign value to u_Sampler accoring to textUnit
      gl.uniform1i(program.u_Sampler, i);
      gl.bindTexture(gl.TEXTURE_2D, to.texture);
      // Draw
      gl.drawElements(gl.TRIANGLES, to.drawingInfo.indices.length, gl.UNSIGNED_BYTE, 0);
    } 
  }
}
// help the initalize all the transform the model[index] has
function initModelMatrix(modelMatrix, trans, index){
  switch(trans[index].type){
    case "translate":
      modelMatrix.translate(trans[index].content[0], trans[index].content[1], trans[index].content[2]);
      break;
    case "rotate":
      modelMatrix.rotate(trans[index].content[0], trans[index].content[1], trans[index].content[2], trans[index].content[3]);
      break;
    case "scale":
      modelMatrix.scale(trans[index].content[0], trans[index].content[1], trans[index].content[2]);
      break;
    default:
      break;
  }
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

function main() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // initialize shader
  textureProgram = createProgram(gl, VSHADER_TEXTURE_SOURCE, FSHADER_TEXTURE_SOURCE);
  light2Program = createProgram(gl, VSHADER_LIGHT2_SOURCE, FSHADER_LIGHT2_SOURCE);
  if (!textureProgram || !light2Program) {
    console.log('Failed to intialize shaders.');
    return;
  }
  initTextureProgram();
  initLightProgram();
  
  // bind key event
  document.onkeydown = function(ev){ keydown(ev, gl);};
  document.onkeyup = function(ev){ keyup(ev, gl);};

  var tick = function() {
    animate();
    renderScene();
    animationId = requestAnimationFrame(tick, canvas); // Request that the browser calls tick
  };
  tick();
}

//################################################################
//    初始化program
//################################################################
// initialize texture program
function initTextureProgram(){
  // get the variable in texture program
  // get attributes
  textureProgram.a_Position = gl.getAttribLocation(textureProgram, 'a_Position');
  textureProgram.a_Normal = gl.getAttribLocation(textureProgram, 'a_Normal');
  textureProgram.a_TexCoord = gl.getAttribLocation(textureProgram, 'a_TexCoord');
  // get the matrix
  textureProgram.u_ModelMatrix = gl.getUniformLocation(textureProgram, 'u_ModelMatrix'); 
  textureProgram.u_MvpMatrix = gl.getUniformLocation(textureProgram, 'u_MvpMatrix');
  textureProgram.u_NormalMatrix = gl.getUniformLocation(textureProgram, 'u_NormalMatrix');
  textureProgram.u_Sampler = gl.getUniformLocation(textureProgram, 'u_Sampler');
  // get the variable about light
  textureProgram.u_DirectionLight = gl.getUniformLocation(textureProgram, 'u_DirectionLight');
  textureProgram.u_AmbientLight = gl.getUniformLocation(textureProgram, 'u_AmbientLight');
  textureProgram.u_LightPosition = gl.getUniformLocation(textureProgram, 'u_LightPosition');
  textureProgram.u_PointLightColor = gl.getUniformLocation(textureProgram, 'u_PointLightColor');
  textureProgram.isPointLightOn = gl.getUniformLocation(textureProgram, 'isPointLightOn');

  if (textureProgram.a_Position < 0 || textureProgram.a_Normal < 0 || textureProgram.a_TexCoord < 0
      ||!textureProgram.u_MvpMatrix || !textureProgram.u_NormalMatrix || !textureProgram.u_Sampler 
      ||!textureProgram.u_ModelMatrix || !textureProgram.u_DirectionLight || !textureProgram.u_AmbientLight
      ||!textureProgram.u_LightPosition || !textureProgram.u_PointLightColor){ 
    console.log('Failed to get the storage location of attribute or uniform variable in texture shader'); 
    return;
  }
  
  // initialize all texture object
  for(i = 0; i < 2; i++){
    var to = new TexObject();
    // Prepare empty buffer objects for vertex coordinates, colors, and normals
    to.model = initTexVertexBuffers(gl, textureProgram);
    if (!to.model) {
      console.log('Failed to set the vertex information');
      continue;
    }
    // initialize the texture infomation for the object
    to.texture = initTexture(gl, textureProgram, i);
    if (!to.texture) {
      console.log('Failed to intialize the texture.');
      continue;
    }

    //压入物体列表中
    TexObjectList.push(to);
  }
}
// initialize light program
function initLightProgram(){  
  // get the variable in light program
  // get attributes
  light2Program.a_Position = gl.getAttribLocation(light2Program, 'a_Position');
  light2Program.a_Color = gl.getAttribLocation(light2Program, 'a_Color');
  light2Program.a_Normal = gl.getAttribLocation(light2Program, 'a_Normal');
  // get the matrix
  light2Program.u_ModelMatrix = gl.getUniformLocation(light2Program, 'u_ModelMatrix'); 
  light2Program.u_MvpMatrix = gl.getUniformLocation(light2Program, 'u_MvpMatrix');
  // get the variable about light
  light2Program.u_NormalMatrix = gl.getUniformLocation(light2Program, 'u_NormalMatrix');
  light2Program.u_DirectionLight = gl.getUniformLocation(light2Program, 'u_DirectionLight');
  light2Program.u_AmbientLight = gl.getUniformLocation(light2Program, 'u_AmbientLight');
  light2Program.u_LightPosition = gl.getUniformLocation(light2Program, 'u_LightPosition');
  light2Program.u_PointLightColor = gl.getUniformLocation(light2Program, 'u_PointLightColor');
  light2Program.isPointLightOn = gl.getUniformLocation(light2Program, 'isPointLightOn');

  if(light2Program.a_Position<0 ||light2Program.a_Color<0 ||light2Program.a_Normal<0 
    ||!light2Program.u_MvpMatrix||!light2Program.u_NormalMatrix || !light2Program.u_ModelMatrix
    ||!light2Program.u_DirectionLight || !light2Program.u_AmbientLight
    ||!light2Program.u_PointLightColor || !light2Program.u_LightPosition){ 
    console.log('Failed to get the storage location of attribute or uniform variable in light shader'); 
    return;
  }
  
  // initialize all light object
  var i = 0;
  for(i =0; i<ObjectList.length; i++){
    var e = ObjectList[i];
    var so = new SceneObject();
    // Prepare empty buffer objects for vertex coordinates, colors, and normals
    so.model = initVertexBuffers(gl, light2Program);
    if (!so.model) {
      console.log('Failed to set the vertex information');
      so.valid = 0;
      continue;
    }
    so.valid = 1;
    so.kads= e.kads;
    so.transform = e.transform;
    so.objFilePath = e.objFilePath;
    so.color = e.color;
    //补齐最后一个alpha值
    if(so.color.length ==3 ){
      so.color.push(1.0);
    }
    // Start reading the OBJ file
    readOBJFile(so, gl, 1.0, true);
    
    //压入物体列表中
    SceneObjectList.push(so);
  }
}

//################################################################
//    键盘事件
//################################################################
//if one key is down
function keydown(ev, gl) {
  switch(ev.keyCode){
    // transition
    case 65: // A ←
      isCarmLeftOn = true;
      break;
    case 68: // D →
      isCarmRightOn = true;
      break;
    case 87: // W ↑
      isCarmUpOn = true;
      break;
    case 83: // S ↓
      isCarmDownOn = true;
      break;
    // rotation
    case 74: // J ←
      isCarmRotLOn = true;
      break;
    case 76: // L →
      isCarmRotROn = true;
      break;
    case 73: // I ↑
      isCarmRotUOn = true;
      break;
    case 75: // K ↓
      isCarmRotDOn = true;
      break;
    // point light
    case 70: // F
      isPointLightOn = 1;
      togglePointLight();
      break;
    default:
      return;
      break;
  }
}
//if the key is up
function keyup(ev, gl) {
  switch(ev.keyCode){
    // transition
    case 65: // A ←
      isCarmLeftOn = false;
      break;
    case 68: // D →
      isCarmRightOn = false;
      break;
    case 87: // W ↑
      isCarmUpOn = false;
      break;
    case 83: // S ↓
      isCarmDownOn = false;
      break;
    // rotation
    case 74: // J ←
      isCarmRotLOn = false;
      break;
    case 76: // L →
      isCarmRotROn = false;
      break;
    case 73: // I ↑
      isCarmRotUOn = false;
      break;
    case 75: // K ↓
      isCarmRotDOn = false;
      break;
    // point light
    case 70: // F
      isPointLightOn = 0;
      togglePointLight();
      break;
    default:
      return;
      break;
  }
}
// toggle the point light
function togglePointLight(){
  gl.useProgram(light2Program);
  gl.uniform1i(light2Program.isPointLightOn, isPointLightOn);
  gl.useProgram(textureProgram);
  gl.uniform1i(textureProgram.isPointLightOn, isPointLightOn);
  renderScene();
}

//################################################################
//    texture配置物体初始化部分
//################################################################
// Create an buffer object and perform an initial configuration
function initTexVertexBuffers(gl, program) {
  var o = new Object(); // Utilize Object object to return multiple buffer objects
  o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT); 
  o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
  o.texCoordBuffer = createEmptyArrayBuffer(gl, program.a_TexCoord, 2, gl.FLOAT); 
  o.indexBuffer = gl.createBuffer();
  if (!o.vertexBuffer || !o.normalBuffer || !o.indexBuffer || !o.texCoordBuffer) { return null; }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return o;
}
// bind the data according to scene file
function readConfig(gl, model, i) {
  // Acquire the object infomation from scene file
  var drawingInfo;
  if (i == FLOORFLAG){ // if is floor
    drawingInfo = floorRes;
  } else{ // box
    drawingInfo = boxRes;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawingInfo.vertex), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawingInfo.normal), gl.STATIC_DRAW);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, model.texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawingInfo.texCoord), gl.STATIC_DRAW);
  
  drawingInfo.indices = new Uint8Array(drawingInfo.index);
  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

  return drawingInfo;
}

//################################################################
//    texture初始化部分
//################################################################
function initTexture(gl, program, texUnit){
  var texture = gl.createTexture();
  if (!texture){
    console.log('Failed to create the texture object');
    return null;
  }

  var image = new Image();  // Create a image object
  if (!image) {
    console.log('Failed to create the image object');
    return null;
  }
  // Register the event handler to be called when image loading is completed
  image.onload = function(){ loadTexture(gl, texture, program, image, texUnit); };
  // Tell the browser to load an Image
  if (texUnit == FLOORFLAG){ // if floor
    image.src = floorRes.texImagePath;
  } else if (texUnit == BOXFLAG){ // if box
    image.src = boxRes.texImagePath;
  }

  return texture;
}

// Specify whether the texture unit is ready to use
var g_texUnit0 = false, g_texUnit1 = false; 
function loadTexture(gl, texture, program, image, texUnit) {
  // Write the image data to texture object
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
  if (texUnit == 0) {
    gl.activeTexture(gl.TEXTURE0);
    g_texUnit0 = true;
  } else if (texUnit == 1){
    gl.activeTexture(gl.TEXTURE1);
    g_texUnit1 = true;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture); // Bind the texture object to the target
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // Set texture parameters
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); // Set the image to texture

  // Pass the texure unit to u_Sampler
  gl.useProgram(program);
  gl.uniform1i(program.u_Sampler, texUnit);

  gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
}

//################################################################
//    obj配置物体初始化部分
//################################################################

// Create an buffer object and perform an initial configuration
function initVertexBuffers(gl, program) {
  var o = new Object(); // Utilize Object object to return multiple buffer objects
  o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT); 
  o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
  o.colorBuffer = createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT);
  o.indexBuffer = gl.createBuffer();
  if (!o.vertexBuffer || !o.normalBuffer || !o.colorBuffer || !o.indexBuffer) { return null; }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return o;
}

// Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
  var buffer =  gl.createBuffer();  // Create a buffer object
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);  // Assign the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);  // Enable the assignment

  //在buffer中填入type和element数量信息，以备之后绘制过程中绑定shader使用
  buffer.num = num;
  buffer.type = type;
  
  return buffer;
}

// Read a file
function readOBJFile(so, gl, scale, reverse) {
  var request = new XMLHttpRequest();

  request.onreadystatechange = function() {
    if (request.readyState === 4 && request.status !== 404) {
      onReadOBJFile(request.responseText, so, gl, scale, reverse);
    }
  }
  request.open('GET', so.objFilePath, true); // Create a request to acquire the file
  request.send();                      // Send the request
}

// OBJ File has been read
function onReadOBJFile(fileString, so, gl, scale, reverse) {
  var objDoc = new OBJDoc(so.filePath);  // Create a OBJDoc object
  objDoc.defaultColor = so.color;
  var result = objDoc.parse(fileString, scale, reverse); // Parse the file
  if (!result) {
    so.objDoc = null; so.drawingInfo = null;
    console.log("OBJ file parsing error.");
    return;
  }
  so.objDoc = objDoc;
}

// OBJ File has been read compreatly
function onReadComplete(gl, model, objDoc) {
  // Acquire the vertex coordinates and colors from OBJ file
  var drawingInfo = objDoc.getDrawingInfo();

  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);
  
  // Write the indices to the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);
  return drawingInfo;
}

//################################################################
//    相机的变化
//################################################################
var last = Date.now(); // Last time that this function was called
var elapsed;
function animate() {
  var now = Date.now();   // Calculate the elapsed time
  elapsed = now - last;
  last = now;

  // Update the current camara eye, at up (adjusted by the elapsed time)
  var step = (MOVE_VELOCITY * elapsed) / 1000.0;
  var dirLen = getLen(dir);
  if (isCarmLeftOn){
    goHor(-step);
  }
  if (isCarmRightOn){
    goHor(step);
  }
  if (isCarmUpOn){
    goInNOut(step, dirLen);
  }
  if (isCarmDownOn){
    goInNOut(-step, dirLen);
  }
  var angle = (ROT_VELOCITY * elapsed) / 1000.0;
  angle = angle * Math.PI / 180.0;
  if (isCarmRotLOn){
    turnHor(-angle);
  }
  if (isCarmRotROn){
    turnHor(angle);
  }
  /*
  if (isCarmRotUOn){
    at.elements[2] = tmp2 * Math.cos(angle) + tmp1 * Math.sin(angle) + eye.elements[2];
    at.elements[1] = tmp1 * Math.cos(angle) - tmp2 * Math.sin(angle) + eye.elements[1]; 
  }
  if (isCarmRotDOn){
    at.elements[2] = tmp2 * Math.cos(angle) - tmp1 * Math.sin(angle) + eye.elements[2];
    at.elements[1] = tmp1 * Math.cos(angle) + tmp2 * Math.sin(angle) + eye.elements[1]; 
  }
  */
}
// camera move forward or back
function goInNOut(step, dirLen){  
  var rate = step / dirLen;
  var move = VectorMultNum(dir, rate); // get the step on dir direction
  eye = VectorAdd(eye, move); // update eye accoring to "move"
  updateCamara();
}
// camera move on the left or right
function goHor(step){
  var movDir = VectorCross(dir, up); // get the hor direction
  var rate = step / getLen(movDir); 
  movDir = VectorMultNum(movDir, rate); // get the step on movDir direction
  eye = VectorAdd(eye, movDir);  // update eye accoring to "movDir"
  updateCamara();
}
// camera turn right or left
function turnHor(angle){
  var ro = getRotate(angle);
  var tmp0 = dir.elements[0];
  var tmp2 = dir.elements[2];
  dir.elements[0] = ro.elements[0] * tmp0 + ro.elements[2] * tmp2;
  dir.elements[2] = ro.elements[1] * tmp0 + ro.elements[0] * tmp2;
  updateCamara();
}
// get the rotating info according to the angle
function getRotate(angle){
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  return new Vector4([cos, sin, -sin, -cos]);
}
// update the camera infomation
function updateCamara(){
  at.elements[0] = eye.elements[0] + dir.elements[0];
  at.elements[1] = eye.elements[1] + dir.elements[1];
  at.elements[2] = eye.elements[2] + dir.elements[2];
}
// get the lenghth of v
function getLen(v){
  return Math.sqrt(Math.pow(v.elements[0], 2) + Math.pow(v.elements[1], 2) + Math.pow(v.elements[2], 2));
}
//################################################################
//    动画效果
//################################################################

// draw flying birds
var flyAngle = 0.0;
var flyHeight = 5.0;
var FLY_HEIGHT_BAISC = 0;
var FLY_HEIGHT_VELOCITY = 1/2;
var FLY_ROTATE_VELOCITY = 180;
function drawFlyingbird(modelMatrix){
  flyAngle += (FLY_ROTATE_VELOCITY * elapsed) / 1000.0;
  flyHeight = Math.sin(flyAngle * 2.2 * Math.PI / 180) * FLY_HEIGHT_VELOCITY + FLY_HEIGHT_BAISC;

  modelMatrix.rotate(flyAngle, 0, 1, 0);
  modelMatrix.translate(2, flyHeight, 0);
  return modelMatrix;
}

// draw rotating star
var rotateAngle = 0;
var ROTATE_VELOCITY = 360;
var STEP_VELOCITY = 3;
function drawRotatingStart(modelMatrix){
  rotateAngle += elapsed / 1000.0;
  var rot = Math.sin(rotateAngle) * ROTATE_VELOCITY;
  var step = Math.sin(rotateAngle) * STEP_VELOCITY;
  modelMatrix.rotate(rot, 0, 1, 0);
  modelMatrix.translate(step, 0, 0);
  return modelMatrix;
}