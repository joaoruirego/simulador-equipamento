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
      text1,
      setText1,
      text2,
      setText2,
    },
    ref
  ) => {
    const [width, setWidth] = useState(activeObject ? activeObject.width : "");
    const [fill, setFill] = useState(
      activeObject ? activeObject.fill : "#000000"
    );

    const [heightWindow, setHeightWindow] = useState(292);
    const [deleteBtn, setDeleteBtn] = useState(false);

    const [text, setText] = useState(activeObject ? activeObject.text : "");

    useEffect(() => {
      if (activeObject) {
        setText(activeObject.text);
        setFontSize(activeObject.fontSize || 35);
        setFillColor(activeObject.fill || "#000000");
        setFontFamily(activeObject.fontFamily || "Arial");
      }
    }, [activeObject]);

    const handleTextChange = (e) => {
      const newText = e.target.value;
      setText(newText);
      if (fabricCanvas.current && activeObject) {
        activeObject.set("text", newText);
        fabricCanvas.current.renderAll();
        updateTexture();
      }
      if (editorText == 1) {
        setText1(newText);
      }
      if (editorText == 2) {
        setText2(newText);
      }
    };

    const handleDelete = () => {
      if (fabricCanvas.current && activeObject) {
        fabricCanvas.current.remove(activeObject);
        fabricCanvas.current.discardActiveObject();
        fabricCanvas.current.renderAll();
        closeTabs();
        updateTexture();
      }
    };

    return (
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
                <input
                  placeholder="Escreva o seu texto"
                  className={styles.inputText}
                  value={text}
                  onChange={handleTextChange}
                  style={{ width: "90%" }}
                />
                <button onClick={handleDelete} className={styles.deleteButton}>
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
    );
  }
);

export default TextEditor;
