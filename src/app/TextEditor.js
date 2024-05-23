import React, { useRef, useState, useEffect, forwardRef } from "react";
import styles from "@/styles/page.module.css";
import { fontList } from "./fonts";
import deleteIcon from "@/imgs/binIcon.png";
import NextImage from "next/image";
import { getUVDimensions } from "./get-uv-data";

const TextEditor = forwardRef(
  (
    {
      fabricCanvas,
      activeObject,
      closeTabs,
      updateTexture,
      fontFamily,
      setFontFamily,
      addTextbox,
      fontSize,
      setFontSize,
      textAlign,
      setTextAlign,
      fillColor,
      setFillColor,
      maxTextSize,
      setMaxTextSize,
      editingComponent,
      textData,
      setTextData,
      editorText,
      setEditorText,
    },
    ref
  ) => {
    const [width, setWidth] = useState(activeObject ? activeObject.width : "");
    const [text, setText] = useState(activeObject ? activeObject.text : "");
    const [fill, setFill] = useState(
      activeObject ? activeObject.fill : "#000000"
    );

    const [heightWindow, setHeightWindow] = useState(292);
    const [deleteBtn, setDeleteBtn] = useState(false);

    // useEffect(() => {
    //   let scaleF = getUVDimensions(editingComponent.current) * 0.5;
    //   // Determine which active object is currently selected based on the targetCanvasId
    //   if (fabricCanvas.current && activeObject) {
    //     setText(activeObject.text);
    //     setFontSize(activeObject.fontSize || 35); // Atualiza o estado do tamanho da fonte com base no objeto ativo
    //     setFillColor(activeObject.fill || "#000000"); // Atualiza o estado do tamanho da fonte com base no objeto ativo
    //     setFontFamily("Babas Neue"); // Atualiza o estado do tamanho da fonte com base no objeto ativo
    //   }
    // }, [activeObject]);

    const handleDelete = () => {
      setDeleteBtn(!deleteBtn);
      if (fabricCanvas.current && activeObject) {
        fabricCanvas.current.remove(activeObject);
        fabricCanvas.current.discardActiveObject(); // Remove a seleção atual
        fabricCanvas.current.renderAll(); // Atualiza o canvas
        // closeTabs(); // Fecha as abas de edição se necessário
        updateTexture(); // Atualiza a textura para refletir as mudanças
        closeTabs();
      }
    };

    // const handleTextChange = (e) => {
    //   const newText = e.target.value;
    //   console.log(newText);

    //   // Check which canvas is currently being targeted and if there's an active object selected
    //   if (fabricCanvas.current && activeObject) {
    //     // Update text for the active object in fabricCanvas
    //     activeObject.set("text", newText);
    //     fabricCanvas.current.renderAll();
    //   }

    //   setText(newText);
    //   updateTexture(); // Update the texture to reflect the changes
    //   console.log(fontSize);
    // };

    // useEffect(() => {
    //   if (activeObject && activeObject.type === "textbox") {
    //     // Update local state to reflect the properties of the activeObject
    //     setText(activeObject.text);
    //     setFontFamily(activeObject.fontFamily);
    //     setFontSize(activeObject.fontSize);
    //     setFillColor(activeObject.fill);
    //   }
    // }, [activeObject]);

    // Handler for changes in text input
    const handleTextChange = (e) => {
      const canvas = fabricCanvas.current;

      if (activeObject) {
        activeObject.set("text", e.target.value);
        canvas.renderAll();
        updateTexture();
      }
    };

    const [newSize, setNewSize] = useState(fontSize);
    const handleSizeChange = (e) => {
      let newSize =
        e.target.value < maxTextSize && e.target.value > 0
          ? e.target.value
          : e.target.value >= maxTextSize
          ? maxTextSize
          : e.target.value <= 0
          ? 0.1
          : e.target.value;

      for (let i = 0; i < newSize.length; i++) {
        if (newSize[0] == 0) {
          newSize = String(Number(newSize)); // Convert to Number to remove leading zeros, then back to String
        }
      }

      // Check which canvas is currently being targeted and if there's an active object selected
      if (fabricCanvas.current && activeObject) {
        // Update text for the active object in fabricCanvas
        activeObject.set("fontSize", newSize);
        fabricCanvas.current.renderAll();
      }
      console.log(newSize);
      setFontSize(newSize);
      updateTexture(); // Update the texture to reflect the changes
    };

    const handleFontFamily = (newFontFamily) => {
      // Atualiza o objeto ativo com a nova fontFamily
      if (fabricCanvas.current && activeObject) {
        // Update text for the active object in fabricCanvas
        activeObject.set("fontFamily", newFontFamily);
        fabricCanvas.current.renderAll();
      }

      setFontFamily(newFontFamily); // Atualiza o estado do React para refletir a mudança
      updateTexture(); // Chamada para atualizar a textura, se necessário
    };

    // useEffect(() => {
    //   // Certifique-se de que 'activeObject' e outros objetos similares estejam definidos e atualizados corretamente
    //   // no estado do seu componente antes de tentar usá-los aqui.
    //   if (fontFamily && fabricCanvas.current) {
    //     if (fabricCanvas.current && activeObject) {
    //       activeObject.set("fontFamily", fontFamily);
    //       fabricCanvas.current.requestRenderAll();
    //     }

    //     // Adicione chamadas set para quaisquer outros canvas que você esteja usando,
    //     // similar ao que foi feito acima.

    //     updateTexture(); // Chamada para atualizar a textura, se necessário
    //   }
    // }, [fontFamily, fabricCanvas.current, activeObject, updateTexture]);

    const handleFill = (newFill) => {
      // Check which canvas is currently being targeted and if there's an active object selected
      if (fabricCanvas.current && activeObject) {
        // Update text for the active object in fabricCanvas
        activeObject.set("fill", newFill);
        fabricCanvas.current.renderAll();
      }

      console.log("Active color: ", activeObject);
      setFillColor(newFill); // Atualiza o estado do React para refletir a mudança
      updateTexture(); // Update the texture to reflect the changes
    };

    const handleTextAlign = (newAlign) => {
      if (fabricCanvas.current && activeObject) {
        // Atualiza o objeto ativo com a nova fontFamily
        activeObject.set("textAlign", newAlign);
        fabricCanvas.current.renderAll();
      }

      setTextAlign(newAlign); // Atualiza o estado do React para refletir a mudança
      updateTexture(); // Chamada para atualizar a textura, se necessário
    };

    const [inputText, setInputText] = useState("");

    const handleInputChange = (e) => {
      setInputText(e.target.value);
      if (textData.text1) {
        textData.text1.set({ text: e.target.value });
      }
      if (textData.text2) {
        textData.text2.set({ text: e.target.value });
      }
      fabricCanvas.current.renderAll();
    };

    // In your render

    return (
      <>
        <div className={styles.editZoneText}>
          {activeObject ? (
            <>
              <button className={styles.backBtn} onClick={closeTabs}>
                <p>&#8592; Voltar</p>
              </button>
              <div className={styles.bottomWindowText}>
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    justifyContent: "space-between",
                  }}
                  className={styles.input_Trash}
                >
                  {/* <input
                    placeholder="Escreva o seu texto"
                    className={styles.inputText}
                    style={{ width: "90%", textTransform: "uppercase" }}
                    value={text}
                    // value={text} // Display text from the active object
                    onChange={handleTextChange}
                  /> */}
                  {editorText == 1 && (
                    <input
                      type="text"
                      onChange={(e) => handleTextChange(e, "text1")}
                      placeholder="Update text for Tab 1"
                    />
                  )}
                  {editorText == 2 && (
                    <input
                      type="text"
                      onChange={(e) => handleTextChange(e, "text2")}
                      placeholder="Update text for Tab 2"
                    />
                  )}
                  <button
                    onClick={handleDelete}
                    className={styles.deleteButton}
                  >
                    <NextImage src={deleteIcon} width={25} height={25} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noText}>
              <p className={styles.trititle}>Adicione texto para começar</p>
            </div>
          )}
        </div>
      </>
    );
  }
);

export default TextEditor;
