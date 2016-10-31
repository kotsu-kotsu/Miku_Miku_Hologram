// グローバル変数
var stats
var ready;
var helper, loader;
var clock = new THREE.Clock();
var spotLight, bottomLight;
var fov = 10;
var distance = 210;
var camera_hight = 14;
var light_width = 12;
var mmd_url = "";
var lag = 0;
var model_x = 0;
var model_y = 0;
var model_z = 0;
var audio_duration = "00:00";

// ステータスとパラメータ
var modelStatus = {
    index: 0, 
    changeModel: false,    // ここがtrueになった瞬間モデルが切り替わり始める
    changeModelIndex: 0    // 切り替え先のモデルインデックス
};
var modelParams = [
    {
        name: 'normal',
        file:'', 
        //file: 'test/yyb/index.pmx',
        position: new THREE.Vector3(0, model_x, model_z), 
        boneDictionary: {}, 
        morphDictionary: {}
    }
];
var motionStatus = {
    inAnimation: false,
    name: 'sing',
    index: 0, 
    changeMotion: false,    // ここがtrueになった瞬間モーションが切り替わり始める
    changeMotionIndex: 0    // 切り替え先のモーションインデックス
};
var motionParams = [
    {
        name: 'sing',
        motions: []
        //motions: [{files:['test/melt.vmd']}]
    }
];
var viewParams = [
    {
        name:'top', 
        left: 0,
        bottom: 0.5,
        width: 1.0,
        height: 0.5,
        position: [0, camera_hight, distance],
        rotation: [0, 0, Math.PI], 
        fov: fov
    },
    {
        name: 'left', 
        left: 0,
        bottom: 0,
        width: 0.5,
        height: 1.0,
        position: [distance, camera_hight, 0],
        rotation: [0, Math.PI/2, Math.PI/2], 
        fov: fov*2
    },
    {
        name: 'bottom', 
        left: 0,
        bottom: 0,
        width: 1.0,
        height: 0.5,
        position: [0, camera_hight, -distance],
        rotation: [Math.PI, 0, Math.PI], 
        fov: fov
    }, 
    {
        name: 'right', 
        left: 0.5,
        bottom: 0,
        width: 0.5,
        height: 1.0,
        position: [-distance, camera_hight, 0],
        rotation: [0, -Math.PI/2, -Math.PI/2], 
        fov: fov*2
    }
];
var audio = new Audio();
//var audio = new Audio("test/melt.mp3");
var audio_path = "";
//audio.controls = true;
//audio.loop = true;

// ロード関係
var onProgress_model = function ( xhr ) {
    if ( xhr.lengthComputable ) {
        var percentComplete = xhr.loaded / xhr.total * 100;
        var displaying_percent = Math.round(percentComplete, 2);
        console.log( 'model ' + displaying_percent + '% downloaded' );
        $('#load-text').html('Loading Model ' + displaying_percent + '%');
        $('#bar span').css('width', displaying_percent + '%');
    }
};
var onError_model = function ( xhr ) {
};
function loadModel (idx, callback ) {
    var param = modelParams[ idx ];
    loader.loadModel( param.file, function ( mesh ) {
        mesh.position.copy( param.position );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        helper.add( mesh );
        helper.setPhysics( mesh ); //物理演算
        scene.add( mesh );
        callback(mesh);
        return;
    }, onProgress_model, onError_model );
}
var onProgress_motion = function ( xhr ) {
    if ( xhr.lengthComputable ) {
        var percentComplete = xhr.loaded / xhr.total * 100;
        var displaying_percent = Math.round(percentComplete, 2);
        console.log( 'motion ' + displaying_percent + '% downloaded' );
        $('#load-text').html('Loading Motion ' + displaying_percent + '%');
        $('#bar span').css('width', displaying_percent + '%');
        if (displaying_percent >= 100){
            $('#load-text').html('Complete!!');
            setTimeout("$('#load_screen').fadeOut();$('#mmd').fadeIn();$('#top_light').fadeIn();$('#params').fadeIn();$('#logo').fadeIn();", 2000);       // この処理は頭わるい
            setTimeout("audio.play()", 3500);
        }
    }
};
var onError_motion = function ( xhr ) {
};
function loadVmds ( mesh, callback ) {
    function load ( paramIndex, motionIndex ) {
        if ( paramIndex >= motionParams.length ) {
            callback();
            return;
        }
        var param = motionParams[ paramIndex ];
        var vmd_files = [].concat(param.motions[ motionIndex ].files);      // ここでアレイをコピーしておかないと復数モデルのロードでバグる
        loader.loadVmds( vmd_files, function ( vmd ) {
            loader.pourVmdIntoModel( mesh, vmd, param.name + motionIndex );
            motionIndex++;
            if ( motionIndex >= param.motions.length ) {
                paramIndex++;
                motionIndex = 0;
            }
            load( paramIndex, motionIndex );
        }, onProgress_motion, onError_motion );
    }
    load( 0, 0 );       
}
function createDictionary ( mesh, idx) {
    var bones = mesh.skeleton.bones;
    for ( var i = 0; i < bones.length; i++ ) {
        var b = bones[ i ];
        modelParams[idx].boneDictionary[ b.originalName ] = i;
    }
    modelParams[idx].morphDictionary = mesh.morphTargetDictionary;
}

// 初期設定
function init() {
    // カメラ
    for (var ii =  0; ii < viewParams.length; ++ii ) {
        var view = viewParams[ii];
        camera = new THREE.PerspectiveCamera( view.fov, $("#mmd").width() / $("#mmd").height(), 1, 2000 );
        camera.position.x = view.position[ 0 ];
        camera.position.y = view.position[ 1 ];
        camera.position.z = view.position[ 2 ];
        camera.rotation.x = view.rotation[ 0 ];
        camera.rotation.y = view.rotation[ 1 ];
        camera.rotation.z = view.rotation[ 2 ];
        view.camera = camera;
    }
    // シーン
    scene = new THREE.Scene();
    // ライト
    bottomLight = new THREE.SpotLight( 0xffffff );
    bottomLight.angle = 0.3;
    bottomLight.penumbra = 1.0;
    bottomLight.distance = 79;
    bottomLight.position.set(0, 80, 0);
    bottomLight.intensity = 4;
    scene.add( bottomLight );
//    var bottomLightHelper = new THREE.SpotLightHelper(bottomLight);
//    scene.add( bottomLightHelper);
    spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.angle = 0.3;
    spotLight.penumbra = 1.0;
    spotLight.distance = 200;
    spotLight.position.set(0, 80, 0);
    spotLight.intensity = 1.5;
    scene.add( spotLight );
//    var spotLightHelper = new THREE.SpotLightHelper(spotLight);
//    scene.add( spotLightHelper);
    // レンダラ
    renderer = new THREE.WebGLRenderer( { antialias: true} );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setClearColor( new THREE.Color( "black" ) );
    renderer.setSize( $("#mmd").width(), $("#mmd").height());
    document.getElementById('mmd').appendChild(renderer.domElement);
    // 影
    renderer.shadowMap.enabled = true;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.x = 1024;
    spotLight.shadow.mapSize.y = 1024;
    spotLight.shadow.camera.right = 20;
    spotLight.shadow.camera.top = 20;
    spotLight.shadow.camera.left = -20;
    spotLight.shadow.camera.bottom = -20;
    renderer.shadowMap.renderSingleSided = false;
    renderer.shadowMap.renderReverseSided = false;
    spotLight.shadow.bias = -0.00007;
    // モデル
    helper = new THREE.MMDHelper( renderer );
    loader = new THREE.MMDLoader();
    loader.setDefaultTexturePath( 'model/default/' );
    loadModel(0, function (mesh) {       
        loadVmds( mesh, function () {
            helper.setAnimation( mesh );
            createDictionary(mesh, 0);
            for ( var i = 0; i < motionParams.length; i++ ) {
                var param = motionParams[ i ];
                for ( var j = 0; j < param.motions.length; j++ ) {
                    var name = param.name + j;
                    mesh.mixer.clipAction( name ).stop();
                    mesh.mixer.clipAction( name + 'Morph' ).stop();
                    mesh.mixer.clipAction( name ).loop = THREE.LoopOnce;      // ループ処理   
                    mesh.mixer.clipAction( name + 'Morph' ).loop = THREE.LoopOnce;  
                    mesh.mixer.clipAction( name ).clampWhenFinished = true;     //モーション終了時に固定する
                    mesh.mixer.clipAction( name + 'Morph' ).clampWhenFinished = true;  
                }
            }
            InitialMotion();
            ready = true;
        });
    });
    // 床
    var material = new THREE.MeshPhongMaterial();
    var plane = new THREE.BoxGeometry(100, 1, 100);
    var mesh_h = new THREE.Mesh( plane,  material );
    mesh_h.position.set( 0, -0.48, 0 );
    mesh_h.receiveShadow = true;
    scene.add( mesh_h );
    // ステータス
    stats = new Stats();
    //document.body.appendChild(stats.domElement);
    // リサイズイベント
    window.addEventListener( 'resize', onWindowResize, false );
}

// レンダリング
function animate() {
    //stats.update();
    requestAnimationFrame( animate );
    render();
}
function render() {
    if ( ready ) {
        ManageView();
        var delta = clock.getDelta();
        helper.animate( delta );
        helper.render( scene, viewParams );
    } 
    else {
        for ( var ii = 0; ii < viewParams.length; ++ii ) {
            view = viewParams[ii];
            camera = view.camera;
            var left   = Math.floor( $("#mmd").width()  * view.left );
            var bottom = Math.floor( $("#mmd").height() * view.bottom );
            var width  = Math.floor( $("#mmd").width()  * view.width );
            var height = Math.floor( $("#mmd").height() * view.height );
            renderer.setViewport( left, bottom, width, height );
            renderer.setScissor( left, bottom, width, height );
            renderer.setScissorTest( true );
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.render( scene, camera );
        }
    }
}

// ウィンドウのサイズの調整
function onWindowResize() {
    windowHalfX = $("#mmd").width() / 2;
    windowHalfY = $("#mmd").height() / 2;
    camera.aspect = $("#mmd").width() / $("#mmd").height();
    camera.updateProjectionMatrix();
    renderer.setSize( $("#mmd").width(), $("#mmd").height() );
}

// モーション制御
function InitialMotion(){     // 一番最初のモーションを表示する(再生はしない)
    for ( var i = 0; i < modelParams.length; i++ ) {
        var mesh = helper.meshes[i];
        var name = motionStatus.name + motionStatus.index;
        mesh.mixer.clipAction( name ).play();
        mesh.mixer.clipAction( name ).paused = true;
        mesh.mixer.clipAction( name + 'Morph' ).play();
        mesh.mixer.clipAction( name + 'Morph' ).paused = true;
    }
}
function SeekMotion(time){
    for ( var i = 0; i < modelParams.length; i++ ) {
        var mesh = helper.meshes[i];
        var name = motionStatus.name + motionStatus.index;
        mesh.mixer.clipAction( name ).time = time;
        mesh.mixer.clipAction( name + 'Morph' ).time = time;
    }
}
function ResumeMotion(time){
    for ( var i = 0; i < modelParams.length; i++ ) {
        var mesh = helper.meshes[i];
        var name = motionStatus.name + motionStatus.index;
        mesh.mixer.clipAction( name ).time = time;
        mesh.mixer.clipAction( name + 'Morph' ).time = time;
        mesh.mixer.clipAction( name ).paused = false;
        mesh.mixer.clipAction( name + 'Morph' ).paused = false;
    }
    motionStatus.inAnimation = true;
}
function PauseMotion(){
    for ( var i = 0; i < modelParams.length; i++ ) {
        var mesh = helper.meshes[i];
        var name = motionStatus.name + motionStatus.index;
        mesh.mixer.clipAction( name ).paused = true;
        mesh.mixer.clipAction( name + 'Morph' ).paused = true;
    }
    motionStatus.inAnimation = false;
}
// モデル制御
function RotateModel(deg){
    for ( var i = 0; i < modelParams.length; i++ ) {
        var mesh = helper.meshes[i];
        mesh.rotation.y += deg;
    }
}
function FrontModel(diff){
    for ( var i = 0; i < modelParams.length; i++ ) {
        var mesh = helper.meshes[i];
        mesh.position.z -= diff;
    }
}
function BackModel(diff){
    for ( var i = 0; i < modelParams.length; i++ ) {
        var mesh = helper.meshes[i];
        mesh.position.z += diff;
    }
}
function RightModel(diff){
    for ( var i = 0; i < modelParams.length; i++ ) {
        var mesh = helper.meshes[i];
        mesh.position.x += diff;
    }
}
function LeftModel(diff){
    for ( var i = 0; i < modelParams.length; i++ ) {
        var mesh = helper.meshes[i];
        mesh.position.x -= diff;
    }
}
// カメラ制御
function ManageView(){
    for ( var ii = 0; ii < viewParams.length; ++ii ) {
        view = viewParams[ii];
        camera = view.camera;
        camera.position.x = view.position[ 0 ];
        camera.position.y = view.position[ 1 ];
        camera.position.z = view.position[ 2 ];
        camera.rotation.x = view.rotation[ 0 ];
        camera.rotation.y = view.rotation[ 1 ];
        camera.rotation.z = view.rotation[ 2 ];
    }
}

// イベント
audio.onseeked = function() {
    var currentTime = audio.currentTime;
    if (currentTime + lag/1000 <= 0){
        PauseMotion();
        SeekMotion(0);
    }else{
        SeekMotion(currentTime + lag/1000);
    }
}
audio.onplaying = function() {
    var currentTime = audio.currentTime;
    if (currentTime + lag/1000 <= 0){
        setTimeout("ResumeMotion(0);", -lag); 
    }else{
        ResumeMotion(currentTime + lag/1000);
    }
};
audio.onpause = function() {
    PauseMotion();
}
audio.ontimeupdate = function() {
    var currentTime = parseInt(audio.currentTime).toString().toHHMMSS();
    $("#audio_time").text("時間 　　　　　: " + currentTime + " / " + audio_duration);
}
audio.onloadeddata = function() {
    audio_duration = parseInt(audio.duration).toString().toHHMMSS();
    $("#audio_time").text("時間 　　　　　: 00:00 / " + audio_duration);
};

// コントロール
var help_open = false;
$(document).on("keydown", function(event){  
    //console.log(event.which);
    if (event.which == 32 && ready == true){            // スペース     再生/一時停止
        if (audio.paused  == true){
            audio.play();
        }else{
            audio.pause();
        }
    }
    else if (event.which == 13 && ready == true){       // エンター     頭出し
        audio.currentTime = 0;
    }
    else if (event.which == 37 && ready == true){       // 左   左回転
        RotateModel(Math.PI/45);
        model_y -= 4;
        $("#model_y").text("モデルの Y 回転 : " + model_y);
    }
    else if (event.which == 39 && ready == true){       // 右   右回転
        RotateModel(-Math.PI/45);
        model_y += 4;
        $("#model_y").text("モデルの Y 回転 : " + model_y);
    }
    else if (event.which == 40 && ready == true){       // 上   視点の高さを上げる
        viewParams[0].position[1] += 0.1;
        viewParams[1].position[1] += 0.1;
        viewParams[2].position[1] += 0.1;
        viewParams[3].position[1] += 0.1;
        $("#camera_y").text("カメラの高さ　 : " + viewParams[0].position[1].toFixed(1));
    }
    else if (event.which == 38 && ready == true){       // 下   視点の高さを下げる
        viewParams[0].position[1] -= 0.1;
        viewParams[1].position[1] -= 0.1;
        viewParams[2].position[1] -= 0.1;
        viewParams[3].position[1] -= 0.1;
        $("#camera_y").text("カメラの高さ　 : " + viewParams[0].position[1].toFixed(1));
    }
    else if (event.which == 87 && ready == true){       // w    ミクを奥に移動
        FrontModel(0.1);
        model_z += 0.1
        $("#model_z").text("モデルの Z 座標 : " + model_z.toFixed(1));
    }
    else if (event.which == 83 && ready == true){       // s    ミクを手前に移動
        BackModel(0.1);
        model_z -= 0.1
        $("#model_z").text("モデルの Z 座標 : " + model_z.toFixed(1));
    }
    else if (event.which == 65 && ready == true){       // a    ミクを左に移動
        RightModel(0.1);
        model_x -= 0.1
        $("#model_x").text("モデルの X 座標 : " + model_x.toFixed(1));
    }
    else if (event.which == 68 && ready == true){       // d    ミクを右に移動
        LeftModel(0.1);
        model_x += 0.1
        $("#model_x").text("モデルの X 座標 : " + model_x.toFixed(1));
    }
    else if (event.which == 90 && ready == true){       // z    カメラを引く
        viewParams[0].position[2] += 2;
        viewParams[1].position[0] += 2;
        viewParams[2].position[2] -= 2;
        viewParams[3].position[0] -= 2;
        $("#camera_z").text("モデルとの距離 : " + viewParams[0].position[2]);
    }
    else if (event.which == 88 && ready == true){       // x    カメラズーム
        viewParams[0].position[2] -= 2;
        viewParams[1].position[0] -= 2;
        viewParams[2].position[2] += 2;
        viewParams[3].position[0] += 2;
        $("#camera_z").text("モデルとの距離 : " + viewParams[0].position[2]);
    }
    else if (event.which == 67 && ready == true){       // c    天井の照明サイズを小さくする
        light_width -= 0.2;
        var n = $('#top_light');
        n.css("top",'calc(50% - ' + light_width + 'vmin)');
        n.css("left",'calc(50% - ' + light_width + 'vmin)');
        n.css("width", 'calc(' + (2*light_width) + 'vmin)');
        n.css("height", 'calc(' + (2*light_width) + 'vmin)');
    }
    else if (event.which == 86 && ready == true){       // v    天井の照明サイズを小さくする
        light_width += 0.2;
        var n = $('#top_light');
        n.css("top",'calc(50% - ' + light_width + 'vmin)');
        n.css("left",'calc(50% - ' + light_width + 'vmin)');
        n.css("width", 'calc(' + (2*light_width) + 'vmin)');
        n.css("height", 'calc(' + (2*light_width) + 'vmin)');
    }
    else if (event.which == 66 && ready == true){       // b    照明の範囲を小さくする
        if (spotLight.angle > 0.1){
            spotLight.angle -= 0.01;
            bottomLight.angle -= 0.01;
            $("#light_angle").text("照明の範囲　　: " + spotLight.angle.toFixed(2));
        }
    }
    else if (event.which == 78 && ready == true){       // n    照明の範囲を大きくする
        if (spotLight.angle < 0.7){
            spotLight.angle += 0.01;
            bottomLight.angle += 0.01;
            $("#light_angle").text("照明の範囲　　: " + spotLight.angle.toFixed(2));
        }
    }
    else if (event.which == 75 && ready == true){       // k    モーションの開始時刻を早くする
        lag += 100;
        $("#lag").text("タイミング　　: " + (-lag/1000).toFixed(1));
        var currentTime = audio.currentTime;
        if (currentTime + lag/1000 <= 0){
            SeekMotion(0);
        }else{
            SeekMotion(currentTime + lag/1000);
        }
    }
    else if (event.which == 76 && ready == true){       // l    モーションの開始時刻を遅くする
        lag -= 100;
        $("#lag").text("タイミング　　: " + (-lag/1000).toFixed(1));
        var currentTime = audio.currentTime;
        if (currentTime + lag/1000 <= 0){
            SeekMotion(0);
        }else{
            SeekMotion(currentTime + lag/1000);
        }
    }
    else if (event.which == 72 && ready == true){       // h    ヘルプの開閉
        if (help_open == true){
            $("#manual").fadeOut();
            help_open = false;
        }else{
            $("#manual").fadeIn();
            help_open = true;
        }
    }
});
$("#how_to").on("click", function() {
    if (help_open == true){
        $("#manual").fadeOut();
        help_open = false;
    }else{
        $("#manual").fadeIn();
        help_open = true;
    }
});


// ファイルシステム関係
var fs, err = function(e) {
    var msg = '';
    switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            msg = 'QUOTA_EXCEEDED_ERR';
            break;
        case FileError.NOT_FOUND_ERR:
            msg = 'NOT_FOUND_ERR';
            break;
        case FileError.SECURITY_ERR:
            msg = 'SECURITY_ERR';
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            msg = 'INVALID_MODIFICATION_ERR';
            break;
        case FileError.INVALID_STATE_ERR:
            msg = 'INVALID_STATE_ERR';
            break;
        default:
            msg = 'Unknown Error';
            break;
    };
    console.log('Error: ' + msg);
};
webkitRequestFileSystem(window.TEMPORARY, 5*1024*1024, function(_fs) {
    fs = _fs;
},err);
// モデルの保存 (フォルダ構造をコピーする)
$(":file#model_load").on("change", function() {             
    load_start = false;
    var files = this.files;     // ファイルリスト
    if(!files) return;
    // 過去のデータを削除
    var dirReader = fs.root.createReader();
    dirReader.readEntries (function(results) {
        for (var i in results){
            if(results[i]["isFile"]){
                results[i].remove(function() {
                    console.log('File removed.');
                },  err);
            }else if(results[i]["isDirectory"]){
                results[i].removeRecursively(function() {
                    console.log('Directory removed.');
                }, err);
            }
        }
        save(0);
    });
    // i番目のデータをローカルストレージにコピーする
    function save(i) {              
        var file = files[i];
        var text = file ? file.name : "Done!";
        if(!file) {         // 全てのファイルをファイルシステムに保存し終えた時の処理
            var dirReader = fs.root.createReader();
            // Call the reader.readEntries() until no more results are returned.
            var readEntries = function() {
                dirReader.readEntries (function(results) {
                    for (var i in results){
                        file_names = results[i].name.split(".");
                        file_type = file_names[file_names.length-1];
                        if (file_type == "pmx" || file_type == "pmd"){
                            mmd_url = results[i].toURL();
                            modelParams[0]["file"] = mmd_url;
                            $("#model_name").text("モデル　 　　　: " + results[i].name);
                        }
                    }
                    if (mmd_url != ""){
                        $("#step1").slideUp(function(){
                            $("#step2").slideDown();
                        });
                    }else{
                        alert("MMDモデルのフォルダ構造が正しくありません");
                    }
                });
            };
            readEntries(); // Start reading dirs.
            return
        };
        // フォルダ構造を作る
        var sub_dir_info = file["webkitRelativePath"].split("/");
        var sub_dir_path = sub_dir_info.slice(1,sub_dir_info.length-1).join("/") + "/";
        function createDir(rootDirEntry, folders) {
            // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
            if (folders[0] == '.' || folders[0] == '') {
                folders = folders.slice(1);
            }
            rootDirEntry.getDirectory(folders[0], {create: true}, function(dirEntry) {
                // Recursively add the new subfolder (if we still have another to create).
                if (folders.length) {
                    createDir(dirEntry, folders.slice(1));
                }
            }, err);
        };
        if (sub_dir_path != "/"){
            createDir(fs.root, sub_dir_path.split('/'));
            fs.root.getDirectory(sub_dir_path, {create: true}, function(dirEntry) {
                dirEntry.getFile(file.name, { create: true }, function(fileEntry) {
                    // i番目のファイルをblob化して保存
                    fileEntry.createWriter(function(writer) {
                        writer.onwriteend = function() {
                            save(i+1);      // 次のファイルを保存する
                        };
                        writer.onerror = err;
                        var fr = new FileReader;        // File API呼び出し 新しいblobを作る
                        fr.onloadend = function() {
                            var blob = new Blob([fr.result]);
                            writer.write(blob);
                        };
                        fr.onerror = err;
                        fr.readAsArrayBuffer(file);     // ここでArrayBufferとしてfrを読み込んでいる
                    }, err);
                }, err);
            }, err);
        }else{
            fs.root.getFile(file.name, { create: true }, function(fileEntry) {
                // i番目のファイルをblob化して保存
                fileEntry.createWriter(function(writer) {
                    writer.onwriteend = function() {
                        save(i+1);      // 次のファイルを保存する
                    };
                    writer.onerror = err;
                    var fr = new FileReader;        // File API呼び出し 新しいblobを作る
                    fr.onloadend = function() {
                        var blob = new Blob([fr.result]);
                        writer.write(blob);
                    };
                    fr.onerror = err;
                    fr.readAsArrayBuffer(file);     // ここでArrayBufferとしてfrを読み込んでいる
                }, err);
            }, err);
        }
    }
});
// モーションの保存
$(":file#motion_load").on("change", function() {        
    var files = this.files;     // ファイルリスト
    if(!files) return;
    if(files[0].name.split(".").slice(-1)[0] != "vmd"){
        alert("vmdファイルを選択してください")
        return;
    }
    $("#motion_name").text("モーション　　 : "+files[0].name);
    fs.root.getDirectory('motion', {create: true}, function(dirEntry) {
        dirEntry.getFile(files[0].name, { create: true }, function(fileEntry) {
            fileEntry.createWriter(function(writer) {
                var fr = new FileReader;        // File API呼び出し 新しいblobを作る
                fr.onloadend = function() {
                    var blob = new Blob([fr.result]);
                    writer.write(blob);
                    motionParams[0]["motions"].push({files:[fileEntry.toURL()]})
                    $("#step2").slideUp(function(){
                        $("#step3").slideDown();
                    });
                };
                fr.onerror = err;
                fr.readAsArrayBuffer(files[0]);     // ここでArrayBufferとしてfrを読み込んでいる
            }, err);
        }, err);
    },  err);
});
// 音源の保存
$(":file#music_load").on("change", function() {         
    var files = this.files;     // ファイルリスト
    if(!files) return;
    var file_type = files[0].name.split(".").slice(-1)[0];
    if(file_type != "mp3" && file_type != "m4a" && file_type != "wav"){
        alert("オーディオファイルを選択してください")
        return;
    }
    $("#audio_name").text("音源　 　　　　: "+files[0].name);
    fs.root.getDirectory('audio', {create: true}, function(dirEntry) {
        dirEntry.getFile(files[0].name, { create: true }, function(fileEntry) {
            fileEntry.createWriter(function(writer) {
                var fr = new FileReader;        // File API呼び出し 新しいblobを作る
                fr.onloadend = function() {
                    var blob = new Blob([fr.result]);
                    writer.write(blob);
                    audio_path = fileEntry.toURL();
                    $("#step3").slideUp(function(){
                        $("#load_screen").fadeIn();
                        $("#cover").fadeOut();
                        $("#bg_video").fadeOut(function(){
                            $("#bg_video").hide().remove();
                            audio.src = audio_path;
                            audio.load();
                            init();
                            animate();
                        });
                    });
                };
                fr.onerror = err;
                fr.readAsArrayBuffer(files[0]);     // ここでArrayBufferとしてfrを読み込んでいる
            }, err);
        }, err);
    },  err);
});

// スマホ・タブレット判別
var _ua = (function(u){
    return {
        Tablet:(u.indexOf("windows") != -1 && u.indexOf("touch") != -1 && u.indexOf("tablet pc") == -1) 
            || u.indexOf("ipad") != -1
            || (u.indexOf("android") != -1 && u.indexOf("mobile") == -1)
            || (u.indexOf("firefox") != -1 && u.indexOf("tablet") != -1)
            || u.indexOf("kindle") != -1
            || u.indexOf("silk") != -1
            || u.indexOf("playbook") != -1, 
        Mobile:(u.indexOf("windows") != -1 && u.indexOf("phone") != -1)
            || u.indexOf("iphone") != -1
            || u.indexOf("ipod") != -1
            || (u.indexOf("android") != -1 && u.indexOf("mobile") != -1)
            || (u.indexOf("firefox") != -1 && u.indexOf("mobile") != -1)
            || u.indexOf("blackberry") != -1
    }
})(window.navigator.userAgent.toLowerCase());

// 秒を分に直す
String.prototype.toHHMMSS = function () {
    var sec_num = Math.round(this,  10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    if (hours == "00"){
        var time    = minutes+':'+seconds;
    }else{
        var time    = hours+':'+minutes+':'+seconds;
    }
    return time;
}

// 実行
if (_ua.Mobile || _ua.Tablet){
    alert("Miku Miku Hologram は PC 専用です．");
}else{
    $("#menu").slideDown();
    $("#start").on("click", function() {
        $("#menu").slideUp(function(){
            $("#step1").slideDown();
        });
    });
}
