"use client";
import * as THREE from "three";
import { fabric } from "fabric";
import { useEffect, useRef, useState } from "react";
import TWEEN from "@tweenjs/tween.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Link from "next/link";
import {
  getIntersections,
  loadGLBModel,
  selectImage,
  copyCanvas,
  getIntersection,
  calculateAngle,
  toHexString,
  handleImage,
} from "./utils";
import NextImage from "next/image";
import styles from "@/styles/page.module.css";
import galeryIcon from "../imgs/galeryBlack.png";
import textIcon from "@/imgs/textIcon.png";
import colorIcon from "@/imgs/colorIcon.webp";
import shareIcon from "@/imgs/iconShare.png";
import buildingIcon from "@/imgs/buildingIcon.png";
import model5 from "@/imgs/1foto.png";
import model3 from "@/imgs/2foto.png";
import model1 from "@/imgs/3foto.png";
import model4 from "@/imgs/4foto.png";
import model2 from "@/imgs/5foto.png";
import ColorEditor from "./ColorEditor";
import ImageEditor from "./ImageEditor";
import TextEditor from "./TextEditor";
import { fontList } from "./fonts";
import { useRouter } from "next/navigation";
import { getPartName } from "@/utils/getPartName";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase";
import {
  calculateAverageUV,
  calculateUVArea,
  getUVDimensions,
} from "@/app/get-uv-data";
import camisaIcon from "../../public/camisaIcon.png";
import badgeIcon from "../../public/badgeIcon.png";
import sizeIcon from "../../public/sizeIcon.png";
import numbericon from "../../public/numbericon.png";
import personalizarIcon from "../../public/colorWheel.png";

const ThreeDViewer = () => {
  //qunado da select image fica tudo azul do componente preciso fazer um if ou tirar o azul por enquanto

  //zonas que deixa de dar para pegar na imagem de novo tem a ver com a area de intersecao e preciso fazer alguma diretamente prop. entre a tolerancia

  //meio lento a tocar em imagens ate aparecer os quadrados de scale

  //qunado se mete a imagem pequena deixa de se ter acesso

  //limitar scales
  //tolerance proporcional a scale DONE
  //raycaster layers
  const router = useRouter();
  //three variables-----------------------------------------------------------------------------------------------
  let editingComponent = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef();
  const sceneRef = useRef(null); // Create a ref for the scene

  const raycaster = new THREE.Raycaster();
  let initialMouse = new THREE.Vector2();
  let currentMouse = new THREE.Vector2();
  let initialUVCursor = new THREE.Vector2();
  let currentUVCursor = new THREE.Vector2();
  let initialUVRotationCursor = new THREE.Vector2();
  let orbit;
  const [editingComponentHTML, setEditingComponentHTML] = useState("bodyBIMP");
  const [isLoading, setIsLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState("");

  const [model, setModel] = useState("0");
  const [escolheBtn, setEscolheBtn] = useState(false);
  const [preview, setPreview] = useState(false);
  const [tutorial, setTutorial] = useState(false);

  const [canvasSize, setCanvasSize] = useState(1024); // Default to larger size
  const [variavelAjuste, setVariavelAjuste] = useState(23.67); //9732cm^2 totais de area || area do canvas 230400cm2

  const [fabricCanvases, setFabricCanvases] = useState([]);
  const [maxTextSize, setMaxTextSize] = useState(100);
  const [maxTextSizeStatic, setMaxTextSizeStatic] = useState(100);
  const [minScaleAllowed, setMinScaleAllowed] = useState(40);

  const [textData, setTextData] = useState({ text1: null, text2: null });

  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    const isChrome =
      /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
    const isSafari = /Safari/.test(userAgent) && !isChrome;

    if (isSafari) {
      setCanvasSize(1024); // Supondo que você quer um tamanho menor para Safari
      setVariavelAjuste(23.67);
      setMaxTextSize(100);
      setMaxTextSizeStatic(100);
      setMinScaleAllowed(40);
    } else {
      setCanvasSize(1024); // Tamanho padrão para outros navegadores
      setVariavelAjuste(47.47);
      setMaxTextSize(200);
      setMaxTextSizeStatic(200);
      setMinScaleAllowed(100);
    }
  }, []);

  useEffect(() => {
    let scaleF;
    if (editingComponent.current) {
      scaleF = getUVDimensions(editingComponent.current) * 0.5;

      if (!editingComponent.current.userData.uvArea) {
        let area = calculateUVArea(editingComponent.current.geometry);
        editingComponent.current.userData.uvArea = area;
      }
    }

    setMaxTextSize(Math.floor(maxTextSizeStatic / scaleF / 5));
  }, [editingComponent.current]);

  const [objectNames, setObjectNames] = useState([]); // Estado para armazenar os nomes dos objetos
  const [currentIndex, setCurrentIndex] = useState(0); // Estado para o índice atual

  const [firstClick, setFirstClick] = useState(true);
  let localFirstClick = firstClick; // Copia o estado atual para uma variável local

  const [editorOpen, setEditorOpen] = useState(false);

  //fabric variables----------------------------------------------------------------------------------------------
  let fabricCanvas = useRef(null);
  const [fabricTexture, setFabricTexture] = useState(null);
  let isDragging = false;
  let selectedHandle;
  let isHandleSelected = false;
  let isImageSelected = false;
  let rotated = 0;

  //cor variables
  const [colorEditor, setColorEditor] = useState(false);
  const [imageEditor, setImageEditor] = useState(false);
  const [textEditor, setTextEditor] = useState(false);

  //activeObject variable
  const [activeObject, setActiveObject] = useState(null);

  //nomes certos dos objetos

  function setBGColor(hexColor) {
    const color = hexColor.trim(); // Clean the input
    if (color[0] !== "#" || color.length !== 7) return; // Ensure valid color
    editingComponent.current.material.emissive.setHex(0x000000); // Reset emissive color

    const canvas = fabricCanvas.current;
    if (!canvas) return;

    const startColor = new THREE.Color(canvas.backgroundColor); // Current color
    const endColor = new THREE.Color(color); // New color from input

    let progress = 0; // Initialize progress
    const duration = 400; // Duration of the transition in milliseconds
    const stepTime = 10; // Time each step takes

    function step() {
      progress += stepTime;
      const lerpFactor = progress / duration;
      if (lerpFactor < 1) {
        // Continue interpolation
        const interpolatedColor = startColor.lerpColors(
          startColor,
          endColor,
          lerpFactor
        );
        const cssColor = "#" + interpolatedColor.getHexString();
        canvas.setBackgroundColor(cssColor, canvas.renderAll.bind(canvas));
        requestAnimationFrame(step); // Request the next animation frame
      } else {
        // Final color set after the animation ends
        canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas));
      }
      updateTexture(); // Update texture if needed
    }
    step();
  }

  const updateTexture = () => {
    if (fabricTexture) fabricTexture.needsUpdate = true;
  };

  const [precoFinal, setPrecoFinal] = useState("13.25"); // Preço inicial de 10€ como string para fácil manipulação na renderização
  const [precoAnimado, setPrecoAnimado] = useState("0.00"); // Estado para controlar o valor animado do preço

  const setupCanvases = () => {
    fabricCanvases[0].setDimensions({ width: 100, height: 80 }); // Front
    fabricCanvases[1].setDimensions({ width: 100, height: 100 }); // Back
    fabricCanvases[2].setDimensions({ width: 60, height: 100 }); // Left
    fabricCanvases[3].setDimensions({ width: 60, height: 100 }); // Right
  };

  const [fontSize, setFontSize] = useState(35);
  const [tex, setTex] = useState("");
  const [texMesh, setTexMesh] = useState("");
  const [fillColor, setFillColor] = useState("#000000"); // Default color set to blue
  const [textAlign, setTextAlign] = useState("center");
  const [fontFamily, setFontFamily] = useState("Arial");

  const [docId, setDocId] = useState("");

  //load fabric canvas--------------------------------------------------------------------------------------------
  useEffect(() => {
    fabricCanvas.current = new fabric.Canvas("fabric-canvas", {
      width: canvasSize,
      height: canvasSize,
      backgroundColor: "#fff",
      part: editingComponent.current
        ? editingComponent.current.name
        : "bodyFMIX",
    });
    /* setFabricCanvases((prevCanvases) => [
      ...prevCanvases,
      fabricCanvas.current,
    ]); */

    const imgURL = "/bodyFBG2.png";

    fabric.Image.fromURL(imgURL, (img) => {
      fabricCanvas.current.add(img);
      img.set({
        width: canvasSize,
        height: canvasSize,
        originX: "center",
        originY: "center",
        left: fabricCanvas.current.width / 2,
        top: fabricCanvas.current.height / 2,
        selectable: false,
      });
      fabricCanvas.current.renderAll();
    });

    const texture = new THREE.CanvasTexture(fabricCanvas.current.getElement());
    texture.repeat.y = -1;
    texture.offset.y = 1;
    texture.channel = 0;
    texture.colorSpace = THREE.SRGBColorSpace;
    setFabricTexture(texture);
    openTabs();

    return () => fabricCanvas.current.dispose();
  }, [canvasSize]);

  useEffect(() => {
    // Simulate the click on bodyBIMP after the component mounts
    simulateCenterClick();
  }, []);

  const [clientData, setClientData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  async function getActiveScene() {
    const dataL = await testP();
    //console.log("dataL", dataL);

    try {
      const response = await fetch(
        "https://allkits-server.onrender.com/convertSceneToText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sceneData: dataL,
            clientData,
            model: model,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to convert scene to JSON");
      }

      const data = await response.json(); // Parse JSON response
      const id = data.docId; // Access the docId field

      setDocId(id);

      // You can do further processing with the docId here if needed
    } catch (error) {
      console.error("Error:", error);
    }
  }

  useEffect(() => {
    if (!fabricTexture) return;

    //three set up-------------------------------------------------------------------------------------------------
    const scene = new THREE.Scene();
    sceneRef.current = scene; // Assign the created scene to the ref

    scene.background = new THREE.Color(0xf4f4f4);
    const camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 25;
    camera.position.y = 5;
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xf4f4f4); // cor de fundo da cena
    renderer.setPixelRatio(2); // aumentar os pixeis por pixeis para o dobro

    containerRef.current.appendChild(renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xf4f4f4, 1.5); // luz para se ver à frente
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.5); // luz para se ver à frente
    directionalLight.position.set(90, 45, -45);
    directionalLight2.position.set(-45, 90, 90);
    directionalLight.castShadow = true;
    directionalLight2.castShadow = true;

    scene.add(directionalLight);
    scene.add(directionalLight2);

    const url = "/santaClara.glb";
    setModel("1");
    loadGLBModel(url, scene, setIsLoading, setObjectNames);

    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 0, 0);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.161;
    orbit.screenSpacePanning = false;
    orbit.maxPolarAngle = Math.PI / 1.61; // nao deixa ir o user ver por baixo do hoodie, so o suficiente
    orbit.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: null,
    };
    orbit.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: null,
    };
    orbit.enabled = true;
    orbit.minDistance = 16.1;
    orbit.maxDistance = 35;
    // Create the fog instance and add it to the scene
    // Parameters: fog color, start distance, end distance
    // scene.fog = new THREE.Fog(0xff0000, 10, 100);
    scene.fog = new THREE.FogExp2(0xffffff, 0.0161);

    // Função para animar a cor emissiva
    function animateEmissiveColor(object, startColor, endColor, duration) {
      const start = { r: startColor.r, g: startColor.g, b: startColor.b };
      const end = { r: endColor.r, g: endColor.g, b: endColor.b };

      new TWEEN.Tween(start)
        .to(end, duration)
        .onUpdate(() => {
          // Atualiza a cor emissiva do material
          object.material.emissive.setRGB(start.r, start.g, start.b);
        })
        .start(); // Inicia a animação
    }

    //functions------------------------------------------------------------------------------------------------------
    const handleInteractionStart = (e) => {
      // Determine the input type and extract coordinates accordingly
      const isTouchEvent = e.type.includes("touch");
      const x = isTouchEvent ? e.touches[0].clientX : e.clientX;
      const y = isTouchEvent ? e.touches[0].clientY : e.clientY;

      const canvas = fabricCanvas.current;
      const activeObject = canvas.getActiveObject();
      setActiveObject(activeObject);
      setTocou(true);

      // Calculate normalized device coordinates
      initialMouse.x = (x / window.innerWidth) * 2 - 1;
      initialMouse.y = -(y / window.innerHeight) * 2 + 1;
      let intersections = getIntersections(
        raycaster,
        camera,
        scene,
        initialMouse
      );

      if (
        editingComponent.current &&
        editingComponent.current.material &&
        editingComponent.current.material.emissive &&
        (!intersections.length ||
          editingComponent.current !== intersections[0].object)
      ) {
        editingComponent.current.material.emissive.setHex(0x000000); // Reset emissive color
      }

      //caso existam interseções
      if (
        intersections.length > 0 &&
        intersections[0].object.name.includes("IMP")
      ) {
        openTabs();

        //  EMISSIVE EFFECT
        const object = intersections[0].object;
        intersections[0].object.material.emissive.setHex;
        const currentEmissive = object.material.emissive.getHex();

        // closeTabs();

        // fabricCanvas.current.renderAll();
        setOptions(!options);

        editingComponent.current = intersections[0].object;

        editingComponent.current.material.map = fabricTexture;
        editingComponent.current.material.needsUpdate = true;

        fabricCanvas.current.renderAll();
        updateTexture();

        // intersections[0].object.material.emissive.setHex(0xffffff); // Bright cyan glow

        //caso não existam interseções
      } else {
        setEditingComponentHTML(null);
        closeTabs();

        // editingComponent.current = null;
        fabricCanvas.current.renderAll();
        isHandleSelected = false;
        selectedHandle = null;
        isImageSelected = false;
      }

      fabricCanvas.current.renderAll();
      updateTexture();

      containerRef.current.addEventListener(
        "mousedown",
        handleInteractionStart
      );
      containerRef.current.addEventListener(
        "touchstart",
        handleInteractionStart
      );

      if (editingComponent.current)
        setEditingComponentHTML(editingComponent.current.userData.name);
      if (!editingComponent.current) setEditingComponentHTML("bodyBIMP");
    };

    const onMouseUp = (e) => {
      if (isDragging) {
        isDragging = false;
        orbit.enabled = true;
        isHandleSelected = false;
        selectedHandle = null;
        // Reset any interaction specifics here
        updateTexture(); // Refresh view to finalize interaction
      }
    };

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    //animate--------------------------------------------------------------------------------------------------------
    const animate = () => {
      requestAnimationFrame(animate);
      TWEEN.update(); // Atualiza todas as animações do Tween
      orbit.update(); // Ensures damping effects are recalculated each frame

      renderer.render(scene, camera);
    };
    animate();

    //listeners------------------------------------------------------------------------------------------------------
    const container = containerRef.current;

    window.addEventListener("resize", onWindowResize);
    container.addEventListener("mousedown", handleInteractionStart);
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("touchstart", handleInteractionStart, {
      passive: true,
    });
    container.addEventListener("touchend", onMouseUp, { passive: true });

    fabricCanvas.current.on("object:modified", updateTexture);
    fabricCanvas.current.on("object:scaling", updateTexture);
    fabricCanvas.current.on("object:moving", updateTexture);
    fabricCanvas.current.on("object:rotating", updateTexture);
    fabricCanvas.current.on("object:added", updateTexture);

    return () => {
      renderer.domElement.remove();
      renderer.dispose();
      window.removeEventListener("resize", onWindowResize);
      if (containerRef.current) {
        container.removeEventListener("mousedown", handleInteractionStart);
        container.removeEventListener("mouseup", onMouseUp);
        container.removeEventListener("touchstart", handleInteractionStart);
        container.removeEventListener("touchend", onMouseUp);
      }
      fabricCanvas.current.off("object:modified", updateTexture);
      fabricCanvas.current.off("object:scaling", updateTexture);
      fabricCanvas.current.off("object:moving", updateTexture);
      fabricCanvas.current.off("object:rotating", updateTexture);
      fabricCanvas.current.off("object:added", updateTexture);
    };
  }, [fabricTexture, model]);

  function copyCanvasWOBG(originCanvas, destinationCanvas) {
    destinationCanvas.clear();
    destinationCanvas.backgroundColor = "transparent";
    originCanvas.forEachObject(function (i) {
      destinationCanvas.add(i);
    });
    destinationCanvas.renderAll();
  }

  // //calcular area imprimida
  const calcularEImprimirAreasOcupadas = () => {
    let precoTotal = 13.25; // Preço base de 13.25€

    fabricCanvases.forEach((canvas) => {
      let alphaCanvas = new fabric.Canvas("temp", {
        width: canvas.width,
        height: canvas.height,
        backgroundColor: "transparent",
      });
      copyCanvasWOBG(canvas, alphaCanvas);

      let alphaData = alphaCanvas.toDataURL({ format: "png" });

      let alphaImage = new Image();
      alphaImage.src = alphaData;

      let ctx = alphaCanvas.getContext("2d");
      let imageData = ctx.getImageData(
        0,
        0,
        alphaCanvas.width,
        alphaCanvas.height
      );
      let data = imageData.data;

      let factor = 0;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 10) {
          factor += 1;
        }
      }

      const areaTotalCanvas = alphaCanvas.width * alphaCanvas.height;
      const areaObjeto = factor / areaTotalCanvas;
      const percentagemAreaOcupada =
        areaObjeto / areaTotalCanvas / variavelAjuste;

      const blocosDezCm2Ocupados = Math.ceil(
        (areaTotalCanvas * percentagemAreaOcupada) / 10
      );

      const custoAdicional = blocosDezCm2Ocupados * 1.6;

      precoTotal += custoAdicional;
    });

    // console.log("fabricCanvases:", fabricCanvases);
    setPrecoFinal(precoTotal.toFixed(2)); // atualiza o estado com o preço final
    animatePrice(0, precoTotal, 1000); // anima a mudança de preço
  };

  const animatePrice = (start, end, duration) => {
    let startTime = null;
    const step = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setPrecoAnimado((progress * (end - start) + start).toFixed(2));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setPrecoAnimado(end.toFixed(2)); // Certifica-se de que o preço final é exatamente o que deve ser
      }
    };
    window.requestAnimationFrame(step);
  };

  const onConcluirClicked = () => {
    const precoFinal = calcularEImprimirAreasOcupadas();
    document.getElementById("precoFinal").textContent = `Preço: €${precoFinal}`;
  };

  useEffect(() => {
    const area = 300;
    // A função que realiza o cálculo da área ocupada
    calcularEImprimirAreasOcupadas();
  }, [fabricCanvases, preview, activeObject]);

  //funcoes de abrir e fechar a janela de edicao-------------------------------------------------------------------
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const editZoneRef = useRef(null);
  const btnConcluido = useRef(null);
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const openTabs = () => {
    if (editZoneRef.current) {
      editZoneRef.current.style.right = "0px";
      editZoneRef.current.style.opacity = 1;
      editZoneRef.current.style.transition = "all 0.32s ease-in-out";
      setEditorOpen(true);
    }

    if (btnConcluido.current) {
      btnConcluido.current.style.right = "25px";
      btnConcluido.current.style.opacity = 1;
      btnConcluido.current.style.transition = "all 0.32s ease-in-out";
      setEditorOpen(true);
    }
  };

  // Função para fechar a janela de edição
  const closeEditor = () => {
    if (editZoneRef.current) {
      editZoneRef.current.style.right = "-300px";
      editZoneRef.current.style.opacity = 0;
      editZoneRef.current.style.transition = "all 0.32s ease-in-out";
      setEditorOpen(false);
    }

    if (btnConcluido.current) {
      btnConcluido.current.style.right = "-300px";
      btnConcluido.current.style.opacity = 0;
      btnConcluido.current.style.transition = "all 0.32s ease-in-out";
      setEditorOpen(false);
    }
  };

  const closeTabs = () => {
    setTextEditor(false);
    setColorEditor(false);
    setImageEditor(false);
    setActiveObject(activeObject);
  };

  const [tocou, setTocou] = useState(false);

  const rotateScene = (scene, duration = 1000, angle = Math.PI) => {
    const startRotation = { y: scene.rotation.y };
    const endRotation = { y: scene.rotation.y + angle };
    if (scene.rotation.y == 0) {
      new TWEEN.Tween(startRotation)
        .to(endRotation, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          scene.rotation.y = startRotation.y;
        })
        .start();
    }
  };

  const [options, setOptions] = useState(false);

  const chooseOptions = () => {
    setOptions(!options);
    simulateCenterClick();

    // Rotacionar a cena inteira quando a aba do editor de texto é acionada
    if (sceneRef.current && !tocou) {
      rotateScene(sceneRef.current);
    }
  };

  const addOrUpdateText1 = () => {
    const canvas = fabricCanvas.current;
    if (!textData.text1) {
      const newText = new fabric.Textbox("Initial Text 1", {
        left: 50, // Default position
        top: 50, // Default position
        fontSize: 20,
      });
      canvas.add(newText);
      setTextData((prev) => ({ ...prev, text1: newText }));
    } else {
      textData.text1.set({ text: "Updated Text 1" });
      canvas.renderAll();
    }
  };

  const addOrUpdateText2 = () => {
    const canvas = fabricCanvas.current;
    if (!textData.text2) {
      const newText = new fabric.Textbox("Initial Text 2", {
        left: 100, // Default position
        top: 100, // Default position
        fontSize: 20,
      });
      canvas.add(newText);
      setTextData((prev) => ({ ...prev, text2: newText }));
    } else {
      textData.text2.set({ text: "Updated Text 2" });
      canvas.renderAll();
    }
  };

  const [editorText, setEditorText] = useState(1);

  const textEditorTab = () => {
    addOrUpdateText1();
    setTextEditor(true);
    setEditorText(1);
    // if (activeObject && activeObject.fontSize == 55) {
    //   addTextbox("O SEU NOME");
    // }

    // if (!activeObject) {
    addTextbox("O SEU NOME");
    //
    // console.log("nome: ", activeObject.fontSize);
  };

  const textEditorTab2 = () => {
    addOrUpdateText2();
    setTextEditor(true);
    // setActiveObject(activeObject)
    // if (activeObject && activeObject.fontSize == 265) {
    //   addTextbox2("1");
    setEditorText(2);
    // }

    // if (!activeObject) {
    addTextbox2("1");
    // }
  };

  useEffect(() => {
    // This will ensure any change in textData refreshes appropriately
    if (editorText === 1 && textData.text1) {
      setActiveObject(textData.text1);
      fabricCanvas.current.setActiveObject(textData.text1);
    } else if (editorText === 2 && textData.text2) {
      setActiveObject(textData.text2);
      fabricCanvas.current.setActiveObject(textData.text2);
    }
    fabricCanvas.current.renderAll();
  }, [editorText, textData, fabricCanvas.current]);
  // const [cornerColor, setCornerColor] = useState("rgba(0, 0, 0, 0.4)");
  // useEffect(() => {
  //   if (fabricCanvas.current.backgroundColor == "#000000") {
  //     setCornerColor("rgba(255, 255, 255, 0.4)");
  //   }
  // }, [fabricCanvas.current]);

  function addTextbox(text1) {
    const canvas = fabricCanvas.current;
    let textbox1 = textData.text1;

    if (!textbox1) {
      let position = calculateAverageUV(editingComponent.current);
      const textOptions = {
        originX: "center",
        originY: "center",
        width: 700,
        fontSize: 55,
        fontFamily: "Impact",
        fill: "#ddd",
        textAlign: textAlign,
        editable: true,
        borderColor: "transparent",
        cornerColor: "transparent",
        padding: 5,
        transparentCorners: false,
        cornerSize: 0,
        cornerStyle: "circle",
        shadow: "rgba(0,0,0,0.3) 0px 0px 10px",
        left: canvas.width * position.averageU,
        top: canvas.height * (position.averageV - 0.1) - 160,
      };

      textbox1 = new fabric.Textbox(text1, textOptions);
      canvas.add(textbox1);
      setTextData((prev) => ({ ...prev, text1: textbox1 }));
      setActiveObject(textbox1);
    } else {
      textbox1.set({ text: text1 });
    }
    canvas.setActiveObject(textbox1);
    canvas.renderAll();
    updateTexture();
  }

  function addTextbox2(text2) {
    const canvas = fabricCanvas.current;
    let textbox2 = textData.text2;

    if (!textbox2) {
      let position = calculateAverageUV(editingComponent.current);
      const textOptions = {
        originX: "center",
        originY: "center",
        width: 1000,
        fontSize: 265,
        fontFamily: "Impact",
        fill: "#ddd",
        textAlign: textAlign,
        editable: true,
        borderColor: "transparent",
        cornerColor: "transparent",
        padding: 5,
        transparentCorners: false,
        cornerSize: 0,
        cornerStyle: "circle",
        shadow: "rgba(0,0,0,0.3) 0px 0px 10px",
        left: canvas.width * position.averageU,
        top: canvas.height * (position.averageV - 0.1) + 25,
      };

      textbox2 = new fabric.Textbox(text2, textOptions);
      canvas.add(textbox2);
      setTextData((prev) => ({ ...prev, text2: textbox2 }));
      setActiveObject(textbox2);
    } else {
      textbox2.set({ text: text2 });
    }
    canvas.setActiveObject(textbox2);
    canvas.renderAll();
    updateTexture();
  }

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const updateActiveObject = () => {
      const activeObj = canvas.getActiveObject();
      setActiveObject(activeObj);
      if (activeObj && activeObj.type === "image") {
        setImageSrc(activeObj.getSrc());
      }
    };

    canvas.on("object:selected", updateActiveObject);
    canvas.on("selection:updated", updateActiveObject);
    canvas.on("selection:cleared", () => setActiveObject(null));

    return () => {
      canvas.off("object:selected", updateActiveObject);
      canvas.off("selection:updated", updateActiveObject);
      canvas.off("selection:cleared");
    };
  }, []);

  // Image source effect
  useEffect(() => {
    if (activeObject && activeObject.type == "image") {
      const imageSrc = activeObject.getSrc();
      setImageSrc(imageSrc); // Seta a URL da fonte da imagem no estado
      setTextEditor(false);
      setImageEditor(true);
    } else if (activeObject && activeObject.type == "textbox") {
      setImageEditor(false);
      setTextEditor(true);
    }

    if (fabricCanvas.current) {
      const canvas = fabricCanvas.current;
      const activeObject = canvas.getActiveObject();
      setActiveObject(activeObject);
      //console.log("Active Object do momento: ", activeObject);
      if (activeObject == null) {
        closeTabs();
      }
    }
  }, [activeObject]);

  // Função para retroceder ao nome anterior
  const retrocederZona = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
  };

  // Função para avançar ao próximo nome
  const avancarZona = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex < objectNames.length - 1 ? prevIndex + 1 : prevIndex
    );
  };

  // useEffect(() => {
  //   if (editingComponent.current) {
  //     // lógica que depende de editingComponent.current
  //     setEditingComponentHTML(editingComponent.current.userData.name);
  //   }
  // }, [editingComponent.current]);
  const simulateCenterClick = () => {
    if (!containerRef.current || !sceneRef.current) return;

    // Find the bodyBIMP object in the scene
    const bodyBIMP = sceneRef.current.getObjectByName("bodyBIMP");

    if (!bodyBIMP) {
      console.warn("bodyBIMP not found in the scene.");
      return;
    }

    // Check if bodyBIMP has valid geometry
    if (!bodyBIMP.geometry) {
      console.warn("bodyBIMP does not have a valid geometry.");
      return;
    }

    // Set the editing component to bodyBIMP
    editingComponent.current = bodyBIMP;

    // Set the material map to the fabric texture
    editingComponent.current.material.map = fabricTexture;
    editingComponent.current.material.needsUpdate = true;

    // Simulate opening the editor for this component
    setEditingComponentHTML(editingComponent.current.userData.name);
    openTabs();

    console.log("Simulated click on bodyBIMP and set the fabric texture.");
  };

  const backgroundMagic = useRef(null);
  const modelosZone = useRef(null);
  const modelos = useRef(null);
  const titleModels = useRef(null);

  const magicLoading = () => {
    if (backgroundMagic.current) {
      backgroundMagic.current.style.backgroundColor = "transparent";
      backgroundMagic.current.style.backdropFilter = "blur(0px)";
      backgroundMagic.current.style.transition = "all 1.6s ease-in-out";
    }

    if (modelos) {
      modelos.current.style.gap = "1000px";
      modelos.current.style.transition = "all 0.4s ease-in-out";
      modelos.current.style.opacity = "0";
    }

    if (titleModels) {
      titleModels.current.style.marginTop = "-100%";
      titleModels.current.style.opacity = "0";
      titleModels.current.style.transition = "all 1.2s ease-in-out";
    }
  };

  const [allCanvasData, setAllCanvasData] = useState([]);

  const sendData = async () => {
    //console.log(allCanvasData);
    const mergedData = { data: allCanvasData, clientData, docId: docId };

    try {
      const response = await fetch(
        "https://allkits-server.onrender.com/sendEmail",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mergedData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send data");
      }

      const responseData = await response.text();
    } catch (error) {
      console.error("Error:", error);
    }
  };
  //console.log(fabricCanvases);
  const testP = async () => {
    const allCanvasData = [];

    for (const canvas of fabricCanvases) {
      const objects = canvas.getObjects();
      const canvasData = {
        width: canvas.width,
        height: canvas.height,
        backgroundColor: canvas.backgroundColor,
        texts: [],
        images: [],
        part: canvas.part,
      };

      for (const obj of objects) {
        if (obj.type === "textbox") {
          console.log(obj);
          //console.log(obj);
          canvasData.texts.push({
            text: obj.text,
            fontFamily: obj.fontFamily,
            fontSize: obj.fontSize,
            color: obj.fill,
            top: obj.top,
            left: obj.left,
            width: obj.width,
            textAlign: obj.textAlign,
          });
        } else if (
          obj.type === "image" &&
          obj._element &&
          obj._element.src.startsWith("data:image")
        ) {
          const baseImage = obj._element.src;

          const imageData = obj._element.src.split(";base64,").pop();
          const imageName = `image_${Date.now()}.png`;
          const imagePath = `images/${imageName}`;
          const imageRef = ref(storage, imagePath);

          try {
            await uploadString(imageRef, imageData, "base64");

            const downloadURL = await getDownloadURL(imageRef);

            canvasData.images.push({
              url: downloadURL,
              base64: baseImage,
              scaleX: obj.scaleX,
              scaleY: obj.scaleY,
              top: obj.top,
              left: obj.left,
              width: obj.width,
              height: obj.height,
              angle: obj.angle ? obj.angle : 0,
              flipX: obj.flipX ? obj.flipX : false,
            });
          } catch (error) {
            console.error("Error uploading image:", error);
          }
        }
      }

      allCanvasData.push(canvasData);
    }
    setAllCanvasData(allCanvasData);
    return allCanvasData;
  };

  const handleChange = (e) => {
    setClientData({
      ...clientData,
      [e.target.name]: e.target.value,
    });
  };

  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    // Function to update window width
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
    };

    // Update window width when component mounts
    updateWindowWidth();

    // event listener to update window width on resize
    window.addEventListener("resize", updateWindowWidth);

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener("resize", updateWindowWidth);
    };
  }, []);
  const nextStep =
    clientData.name != "" &&
    clientData.email != "" &&
    clientData.phone != "" &&
    docId != "";

  const [success, setSuccess] = useState(false);

  // Style based on preview state
  const buttonStyle = {
    right: preview
      ? windowWidth < 750
        ? 110
        : 165
      : windowWidth < 750
      ? 25
      : 50,
    color: preview ? "#fff" : "#fff",
    backgroundColor: preview ? "transparent" : "#fff",
  };

  return (
    <>
      {isLoading && (
        <div className={styles.loadingContainer}>
          <p>A carregar...</p>
        </div>
      )}
      <div ref={containerRef}> </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 0,
        }}
      >
        <div
          style={{ position: "absolute", top: "0", left: "0", display: "none" }}
        >
          <canvas
            id="fabric-canvas"
            style={{
              border: "1px solid #00bfff",
              marginRight: "20px",
              position: "absolute",
              top: "0",
              left: "0",
            }}
          />
        </div>
      </div>

      <div ref={editZoneRef} className={styles.editZone}>
        <div className={styles.editHeader}>
          <h3>
            Personaliza <br></br>
            <b>o teu equipamento</b>
          </h3>
          <div className={styles.sideScroll}>
            <button
              style={{ cursor: "not-allowed", opacity: 0.5 }}
              className={styles.divAreaEspecifica}
            >
              <div className={styles.divIcon}>
                <NextImage
                  style={{ marginTop: -2, marginLeft: -0.5 }}
                  src={camisaIcon}
                  width={25}
                  height={25}
                  alt="step"
                />
              </div>
              <div>
                <p className={styles.titleText}>Camisola</p>
                <p className={styles.infoText}>Escolhe o teu equipamento.</p>
              </div>
            </button>
            <button
              className={styles.divAreaEspecifica}
              onClick={toggleDropdown}
            >
              <div className={styles.divIcon}>
                <NextImage
                  style={{ marginTop: 2, marginLeft: -1 }}
                  src={sizeIcon}
                  width={20}
                  height={20}
                  alt="step"
                />
              </div>
              <div>
                <p className={styles.titleText}>Tamanho</p>
                <p className={styles.infoText}>Escolhe o teu tamanho.</p>
              </div>
            </button>
            {isDropdownOpen && (
              <div className={styles.dropdown}>
                <button
                  onClick={toggleDropdown}
                  className={styles.dropdownButton}
                >
                  XS
                </button>
                <button
                  onClick={toggleDropdown}
                  className={styles.dropdownButton}
                >
                  S
                </button>
                <button
                  onClick={toggleDropdown}
                  className={styles.dropdownButton}
                >
                  M
                </button>

                <button
                  onClick={toggleDropdown}
                  className={styles.dropdownButton}
                >
                  XL
                </button>
              </div>
            )}
            <button
              style={{ cursor: "not-allowed", opacity: 0.5 }}
              className={styles.divAreaEspecifica}
            >
              <div className={styles.divIcon}>
                <NextImage src={badgeIcon} width={20} height={20} alt="step" />
              </div>
              <div>
                <p className={styles.titleText}>Badge</p>
                <p className={styles.infoText}>Escolhe o teu badge.</p>
              </div>
            </button>
            <button
              onClick={chooseOptions}
              className={styles.divAreaEspecifica}
            >
              <div className={styles.divIcon}>
                <NextImage
                  src={personalizarIcon}
                  width={20}
                  height={20}
                  alt="step"
                />
              </div>
              <div>
                <p className={styles.titleText}>Personalizar</p>
                <p className={styles.infoText}>Escolha o seu nome e número.</p>
              </div>
            </button>
            {options && (
              <>
                <button
                  style={{
                    cursor: "not-allowed",
                    opacity: 0.5,
                    marginLeft: 10,
                  }}
                  className={styles.divAreaEspecifica}
                >
                  <div className={styles.divIcon}>
                    <NextImage
                      style={{ marginTop: -2, marginLeft: -0.5 }}
                      src={camisaIcon}
                      width={25}
                      height={25}
                      alt="step"
                    />
                  </div>
                  <div>
                    <p className={styles.titleText}>Escolher Jogador</p>
                    <p className={styles.infoText}>
                      Escolhe a camisa de um jogador.
                    </p>
                  </div>
                </button>
                <button
                  style={{ marginLeft: 10 }}
                  onClick={textEditorTab}
                  className={styles.divAreaEspecifica}
                >
                  <div className={styles.divIcon}>
                    <NextImage
                      src={textIcon}
                      width={20}
                      height={20}
                      alt="step"
                    />
                  </div>
                  <div>
                    <p className={styles.titleText}>Escolher Nome</p>
                    <p className={styles.infoText}>Escolhe o teu nome.</p>
                  </div>
                </button>
                <button
                  style={{ marginLeft: 10 }}
                  onClick={textEditorTab2}
                  className={styles.divAreaEspecifica}
                >
                  <div className={styles.divIcon}>
                    <NextImage
                      src={numbericon}
                      width={20}
                      height={20}
                      alt="step"
                    />
                  </div>
                  <div>
                    <p className={styles.titleText}>Escolher Número</p>
                    <p className={styles.infoText}>Escolhe o teu número.</p>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {!preview && (
        <div className={styles.editZoneTlm}>
          <div className={styles.mainBtns}>
            <button onClick={textEditorTab}>
              <NextImage src={textIcon} width={20} height={20} />
            </button>
          </div>
        </div>
      )}

      <div ref={btnConcluido} className={styles.exportBtnNot}>
        <button
          onClick={() => {
            getActiveScene();
            calcularEImprimirAreasOcupadas();
            setPreview(!preview);
            setTimeout(() => {
              closeEditor();
            }, 200);
            closeTabs();
          }}
          style={buttonStyle}
        >
          {preview ? (
            windowWidth < 450 ? (
              <p
                style={{
                  marginTop: 0,
                  // backgroundColor: "rgba(0, 0, 0 ,0.3)",
                  // padding: 10,
                  // borderRadius: 100,
                  // paddingLeft: 15,
                  // paddingRight: 15,
                }}
              >
                &#8592;
              </p>
            ) : (
              "Voltar à Personalização"
            )
          ) : (
            "Concluído"
          )}
        </button>
      </div>

      {textEditor && (
        <TextEditor
          fabricCanvas={fabricCanvas}
          updateTexture={updateTexture}
          closeTabs={closeTabs}
          addTextbox={addTextbox}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          activeObject={activeObject}
          fontSize={fontSize}
          setFontSize={setFontSize}
          textAlign={textAlign}
          setTextAlign={setTextAlign}
          fillColor={fillColor}
          setFillColor={setFillColor}
          maxTextSize={maxTextSize}
          setMaxTextSize={setMaxTextSize}
          editingComponent={editingComponent}
          textData={textData}
          setTextData={setTextData}
          editorText={editorText}
          setEditorText={setEditorText}
        />
      )}
    </>
  );
};

export default ThreeDViewer;
