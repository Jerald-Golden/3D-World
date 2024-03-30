import * as THREE from 'three';
import { MapControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/MapControls.js';

var scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
var camera = new THREE.OrthographicCamera(-window.innerWidth / 4, window.innerWidth / 4, window.innerHeight / 4, -window.innerHeight / 4, -999, 100000000);
camera.position.set(0, 10000, 1000);
scene.add(camera);

var renderer = new THREE.WebGLRenderer({ canvas: my_canvas });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

var controls = new MapControls(camera, renderer.domElement);
controls.enableRotate = false;
// controls.zoomToCursor = true;
controls.update();
render();

let realZoom = [1]

const Map = { url: undefined };

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('form');
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const selectedValue = document.getElementById('Maps').value;
        if (selectedValue === "Satellite") {
            Map.url = 'https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}';
            updateSameLevel();
        } else if (selectedValue === "Hybrid") {
            Map.url = 'http://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}';
            updateSameLevel();
        } else if (selectedValue === "RoadMap") {
            Map.url = 'http://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}';
            updateSameLevel();
        } else if (selectedValue === "Osm") {
            Map.url = undefined;
            updateSameLevel();
        }
    });
});

var Objects = [];

scene.background = new THREE.Color(0xf0f0f0);



var light = new THREE.AmbientLight(0xffffff);
scene.add(light);

var view = new ol.View({
    projection: 'EPSG:4326',
    zoom: 1,
    center: [0, 0],
});

var map = new ol.Map({
    target: "map",
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM({
                url: Map.url
            })
        }),
    ],
    view: view
});

map.on("click", function (e) {
    console.log(e.coordinate);
})

var planeGeometry = new THREE.PlaneGeometry(700, 350);
var planeMaterial = new THREE.MeshBasicMaterial();
var plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = 0;
scene.add(plane);
Objects.push(plane);

map.on('loadend', addTexture);


var corners = [[-180, 90], [180, 90], [-180, -90], [180, -90]];
let uvs = plane.geometry.getAttribute('uv');
let val = [...uvs.array];

map.addControl(new ol.control.MousePosition({
    coordinateFormat: function (coordinate) {
        return ol.coordinate.format(coordinate, 'Lat: {y}, Long: {x}', 2);
    },
    className: 'coordinate_display',
    change: function (evt) {
        console.log(evt);
    },
    projection: 'EPSG:4326',
}));

function addTexture() {

    const float32 = new Float32Array(val);
    uvs.array = float32;
    map.previousExtent_ = map.getView().calculateExtent(map.getSize(), 'EPSG:3857', 'EPSG:4326');

    corners[0] = ol.extent.getTopLeft(map.previousExtent_);
    corners[1] = ol.extent.getTopRight(map.previousExtent_);
    corners[2] = ol.extent.getBottomLeft(map.previousExtent_);
    corners[3] = ol.extent.getBottomRight(map.previousExtent_);

    corners.forEach(value => {
        var lon = value[0];
        if (lon > 180) {
            value[0] = (((lon / 180) - Math.floor(lon / 180)) * 180);
        }
        if (lon < -180) {
            value[0] = (((((lon * -1) / 180) - Math.floor((lon * -1) / 180)) * (180 * -1) + 180));
        }
    })

    for (let i = 0; i < uvs.count; i++) {
        let uv = new THREE.Vector2(uvs.getX(i), uvs.getY(i));
        let lon = uv.x * 360 - 180;
        let lat = uv.y * 180 - 90;

        let u = (lon - corners[0][0]) / (corners[1][0] - corners[0][0]);
        let v = (lat - corners[2][1]) / (corners[0][1] - corners[2][1]);

        // uvs.setX(i, u / 2 + 0.5);
        // uvs.setX(i, u / 2);
        uvs.setX(i, u);
        uvs.setY(i, v);
    }


    plane.geometry.setAttribute('uv', uvs);
    plane.geometry.attributes.uv.needsUpdate = true;

    var mapContainer = document.getElementById('map');
    var mapCanvas = mapContainer.getElementsByTagName('canvas')[0];
    var texture = new THREE.CanvasTexture(mapCanvas);
    texture.encoding = THREE.sRGBEncoding;
    plane.material.map = texture;
    plane.material.needsUpdate = true;
}



function onPointerClick(event) {
    let latlong = [];
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    let intersects = raycaster.intersectObjects(Objects, false);

    const planeWidth = 700;
    const planeHeight = 350;

    const mercX = (intersects[0].point.x + planeWidth / 2) / planeWidth * 2 - 1;
    const mercY = (intersects[0].point.z + planeHeight / 2) / planeHeight * 2 - 1;

    latlong[0] = mercX * 180;
    latlong[1] = -(mercY * 90);

    console.log(latlong);
}

function latLon(x, z) {
    let latlong = [];

    const planeWidth = 700;
    const planeHeight = 350;

    const mercX = (x + planeWidth / 2) / planeWidth * 2 - 1;
    const mercY = (z + planeHeight / 2) / planeHeight * 2 - 1;

    latlong[0] = mercX * 180;
    latlong[1] = -(mercY * 90);

    return [latlong[0], latlong[1]];
}

let level = [1];

function updateSameLevel() {
    var vector = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(vector, camera);
    let intersects = raycaster.intersectObject(plane);

    if (intersects[0] !== undefined) {

        let latlong = (latLon(intersects[0].point.x, intersects[0].point.z));

        // console.log(latlong);
        // console.log(level[0]);
        if (level[0] === 1 || level[0] === 2) {
            latlong[0] = 0;
            latlong[1] = 0;
            level[0] = 1;
        }

        $("#map").empty();

        view = new ol.View({
            projection: 'EPSG:4326',
            zoom: level[0],
            center: [latlong[0], latlong[1]],
        });

        map = new ol.Map({
            target: "map",
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM({
                        url: Map.url
                    })
                }),
            ],
            view: view
        });

        map.on('loadend', addTexture);


        map.addControl(new ol.control.MousePosition({
            coordinateFormat: function (coordinate) {
                return ol.coordinate.format(coordinate, 'Lat: {y}, Long: {x}', 4);
            },
            className: 'coordinate_display',
            change: function (evt) {
                console.log(evt);
            },
            projection: 'EPSG:4326',
        }));
    }
}


function updateLevel(zoom) {
    level[0] = zoom;
    var vector = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(vector, camera);
    let intersects = raycaster.intersectObject(plane);

    if (intersects[0] !== undefined) {

        let latlong = (latLon(intersects[0].point.x, intersects[0].point.z));

        // console.log(latlong);
        if (zoom <= 2) {
            latlong[0] = 0;
            latlong[1] = 0;
            zoom = 1;
        }

        $("#map").empty();

        view = new ol.View({
            projection: 'EPSG:4326',
            zoom: zoom,
            center: [latlong[0], latlong[1]],
        });

        map = new ol.Map({
            target: "map",
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM({
                        url: Map.url
                    })
                }),
            ],
            view: view
        });

        map.on('loadend', addTexture);

        map.addControl(new ol.control.MousePosition({
            coordinateFormat: function (coordinate) {
                return ol.coordinate.format(coordinate, 'Lat: {y}, Long: {x}', 4);
            },
            className: 'coordinate_display',
            change: function (evt) {
                console.log(evt);
            },
            projection: 'EPSG:4326',
        }));
    }

}

let Canvas = document.getElementById('my_canvas');

window.addEventListener('dblclick', onPointerClick);
window.addEventListener('resize', onWindowResize);
map.addEventListener('wheel', addTexture);
Canvas.addEventListener("wheel", onWheel);
Canvas.addEventListener('mouseup', updateSameLevel);


function onWheel(event) {
    var camZoom = realZoom[0];

    if (event.deltaY < 0) {
        console.log(camZoom + 1);
        switch (camZoom) {
            case 1:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.5;
                zoomin(2);
                camera.updateProjectionMatrix();
                updateLevel(2);
                break;
            case 2:
                controls.rotateSpeed = 0.05;
                realZoom[0] += 1;
                zoomin(4);
                camera.updateProjectionMatrix();
                updateLevel(3);
                break;
            case 3:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(7);
                camera.updateProjectionMatrix();
                updateLevel(4);
                break;
            case 4:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(14);
                camera.updateProjectionMatrix();
                updateLevel(5);
                break;
            case 5:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(30);
                camera.updateProjectionMatrix();
                updateLevel(6);
                break;
            case 6:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(55);
                camera.updateProjectionMatrix();
                updateLevel(7);
                break;
            case 7:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(115);
                camera.updateProjectionMatrix();
                updateLevel(8);
                break;
            case 8:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(225);
                camera.updateProjectionMatrix();
                updateLevel(9);
                break;
            case 9:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(430);
                camera.updateProjectionMatrix();
                updateLevel(10);
                break;
            case 10:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(900);
                camera.updateProjectionMatrix();
                updateLevel(11);
                break;
            case 11:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(1800);
                camera.updateProjectionMatrix();
                updateLevel(12);
                break;
            case 12:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(3500);
                camera.updateProjectionMatrix();
                updateLevel(13);
                break;
            case 13:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(7200);
                camera.updateProjectionMatrix();
                updateLevel(14);
                break;
            case 14:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(15600);
                camera.updateProjectionMatrix();
                updateLevel(15);
                break;
            case 15:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(26000);
                camera.updateProjectionMatrix();
                updateLevel(16);
                break;
            case 16:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(59000);
                camera.updateProjectionMatrix();
                updateLevel(17);
                break;
            case 17:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(120000);
                camera.updateProjectionMatrix();
                updateLevel(18);
                break;
            case 18:
                realZoom[0] += 1;
                controls.rotateSpeed = 0.025;
                zoomin(250000);
                camera.updateProjectionMatrix();
                updateLevel(19);
                break;
            default:
                break;
        }
    } else if (event.deltaY > 0) {
        console.log(camZoom - 1);
        switch (camZoom - 1) {
            case 18:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(120000);
                updateLevel(18);
                camera.updateProjectionMatrix();
                break;
            case 17:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(59000);
                updateLevel(17);
                camera.updateProjectionMatrix();
                break;
            case 16:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(26000);
                updateLevel(16);
                camera.updateProjectionMatrix();
                break;
            case 15:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(15600);
                updateLevel(15);
                camera.updateProjectionMatrix();
                break;
            case 14:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(7200);
                updateLevel(14);
                camera.updateProjectionMatrix();
                break;
            case 13:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(3500);
                updateLevel(13);
                camera.updateProjectionMatrix();
                break;
            case 12:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(1800);
                updateLevel(12);
                camera.updateProjectionMatrix();
                break;
            case 11:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(900);
                updateLevel(11);
                camera.updateProjectionMatrix();
                break;
            case 10:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(430);
                updateLevel(10);
                camera.updateProjectionMatrix();
                break;
            case 9:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(225);
                updateLevel(9);
                camera.updateProjectionMatrix();
                break;
            case 8:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(115);
                updateLevel(8);
                camera.updateProjectionMatrix();
                break;
            case 7:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(55);
                updateLevel(7);
                camera.updateProjectionMatrix();
                break;
            case 6:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(30);
                updateLevel(6);
                camera.updateProjectionMatrix();
                break;
            case 5:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(14);
                updateLevel(5);
                camera.updateProjectionMatrix();
                break;
            case 4:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(7);
                updateLevel(4);
                camera.updateProjectionMatrix();
                break;
            case 3:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.025;
                zoomout(4);
                updateLevel(3);
                camera.updateProjectionMatrix();
                break;
            case 2:
                realZoom[0] -= 1;
                controls.rotateSpeed = 0.5;
                zoomout(2);
                camera.updateProjectionMatrix();
                updateLevel(2);
                break;
            case 1:
                realZoom[0] -= 1;
                controls.rotateSpeed = 1;
                zoomout(1);
                updateLevel(1);
                camera.updateProjectionMatrix();
                break;
            default:
                break;
        }
    }
    // console.log(Math.trunc(camera.zoom));
}


let targetZoom = 0;
let targetZoomSegement = 0;

function zoomin(level) {
    targetZoom = level
    targetZoomSegement = level / 100;
    requestAnimationFrame(updateZoomIn);
}

function updateZoomIn() {

    camera.zoom += targetZoomSegement;
    camera.updateProjectionMatrix();

    if (camera.zoom <= targetZoom) {
        requestAnimationFrame(updateZoomIn);
    } else {
        camera.zoom = targetZoom;
        // console.log(Math.trunc(map.frameState_.viewState.zoom));
        // console.log((camera.zoom));
    }
}

function zoomout(level) {
    targetZoom = level
    targetZoomSegement = level / 100;
    requestAnimationFrame(updateZoomOut);
}

function updateZoomOut() {

    camera.zoom -= targetZoomSegement * 2;
    camera.updateProjectionMatrix();

    if (camera.zoom >= targetZoom) {
        requestAnimationFrame(updateZoomOut);
    } else {
        camera.zoom = targetZoom;
        // console.log(camera.zoom);
    }
}

// function update() {
//     if (camera.zoom >= 250000) {
//         camera.zoom = 250000;
//         camera.updateProjectionMatrix();
//     }
//     requestAnimationFrame(update);
// }

// requestAnimationFrame(update);


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}

render();