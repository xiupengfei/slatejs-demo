import React, { useCallback, useMemo } from "react";
import { jsx } from "slate-hyperscript";
import { Transforms, createEditor } from "slate";
import { withHistory } from "slate-history";
import { css } from "@emotion/css";
import {
  Slate,
  Editable,
  withReact,
  useSelected,
  useFocused,
} from "slate-react";

const ELEMENT_TAGS = {
  A: (el) => ({ type: "link", url: el.getAttribute("href") }),
  BLOCKQUOTE: () => ({ type: "quote" }),
  H1: () => ({ type: "heading-one" }),
  H2: () => ({ type: "heading-two" }),
  H3: () => ({ type: "heading-three" }),
  H4: () => ({ type: "heading-four" }),
  H5: () => ({ type: "heading-five" }),
  H6: () => ({ type: "heading-six" }),
  IMG: (el) => ({ type: "image", url: el.getAttribute("src") }),
  LI: () => ({ type: "list-item" }),
  OL: () => ({ type: "numbered-list" }),
  P: () => ({ type: "paragraph" }),
  // DIV: () => ({ type: 'paragraph' }),
  PRE: () => ({ type: "code" }),
  UL: () => ({ type: "bulleted-list" }),
};

// COMPAT: `B` is omitted here because Google Docs uses `<b>` in weird ways.
const TEXT_TAGS = {
  CODE: () => ({ code: true }),
  DEL: () => ({ strikethrough: true }),
  EM: () => ({ italic: true }),
  I: () => ({ italic: true }),
  S: () => ({ strikethrough: true }),
  STRONG: () => ({ bold: true }),
  U: () => ({ underline: true }),
  // SPAN: () => ({ underline: true }),
};

const typeChildNodes = (childNodes) => {
  const res = {
    hasText: false,
    hasEle: false,
  };
  childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      res.hasText = true;
    } else if (n.nodeType === 1) {
      res.hasEle = true;
    }
    // 其他
  });
  return res;
};

export const deserialize = (el) => {
  if (el.nodeType === 3) {
    return el.textContent;
  } else if (el.nodeType !== 1) {
    return null;
  } else if (el.nodeName === "BR") {
    return "\n";
  }

  const { nodeName } = el;
  let parent = el;

  if (
    nodeName === "PRE" &&
    el.childNodes[0] &&
    el.childNodes[0].nodeName === "CODE"
  ) {
    parent = el.childNodes[0];
  }
  let elementChildNodes = Array.from(parent.childNodes);
  // console.log('Lchildren', Lchildren)
  console.log("elementChildNodes", parent, elementChildNodes);

  /**
   * 1. 当前节点的子节点存在4种情况
   *    a: 全是文本节点
   *    b: 全是嵌套div等
   *    c: 文本和嵌套div混合
   *    d: 空
   */

  const { hasText, hasEle } = typeChildNodes(elementChildNodes);
  // 文本节点/段落节点才展开
  let children = [{ text: "" }]; // elementChildNodes.map(deserialize).flat()

  if (hasText && !hasEle) {
    children = elementChildNodes.map(deserialize).flat();
    console.log("全是文本节点", children, nodeName);
    if (["SPAN"].includes(nodeName)) {
      const SPANParagraph = jsx(
        "element",
        { type: "div", test: "span" },
        children
      );
      console.log("SPANParagraph", SPANParagraph);
      return SPANParagraph;
    }
  }

  if (hasEle && !hasText) {
    // 继续展开children当作空字符串
    children = elementChildNodes.map(deserialize).flat();

    const allDiv = jsx("element", { type: "div", test: "div" }, children);
    console.log("全是嵌套div等", allDiv);
    return allDiv;
  }

  if (hasEle && hasText) {
    children = elementChildNodes.map(deserialize).flat();
    const mixinsEle = jsx("element", { type: "div", test: "body" }, children);
    console.log("文本和嵌套div混合", mixinsEle);
    return mixinsEle;
  }

  if (!hasEle && !hasText) {
    console.log("空节点");
    children = [{ text: "" }];
  }

  if (children.length === 0) {
    children = [{ text: "" }];
  }

  if (el.nodeName === "BODY") {
    console.log("body", jsx("fragment", {}, children));
    return jsx("fragment", {}, children);
  }

  if (ELEMENT_TAGS[nodeName]) {
    const attrs = ELEMENT_TAGS[nodeName](el);
    // console.log('element', jsx('element', attrs, children))
    return jsx("element", attrs, children);
  }

  // if (nodeName === 'DIV') {
  //   console.log('div', parent, children)
  // }

  if (TEXT_TAGS[nodeName]) {
    const attrs = TEXT_TAGS[nodeName](el);
    const textNode = children.map((child) => jsx("text", attrs, child));
    console.log("textNodetextNode", textNode);
    return textNode;
  }

  return children;
};

const PasteHtmlExample = () => {
  const renderElement = useCallback((props) => <Element {...props} />, []);
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
  const editor = useMemo(
    () => withHtml(withReact(withHistory(createEditor()))),
    []
  );
  return (
    <Slate editor={editor} value={initialValue}>
      <Editable
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder="Paste in some HTML..."
      />
    </Slate>
  );
};

const withHtml = (editor) => {
  const { insertData, isInline, isVoid } = editor;

  editor.isInline = (element) => {
    return element.type === "link" ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === "image" ? true : isVoid(element);
  };

  const mockData = [
    { text: "\n" },
    {
      type: "div",
      test: "div",
      children: [
        // {
        //   type: "div",
        //   test: "div",
        //   children: [
        //     { type: "div", test: "span", children: [{ text: "VCCCC" }] },
        //   ],
        // },
        { text: "VCCCC" }
      ],
    },
    { text: "\n\n" },
  ]

  editor.insertData = (data) => {
    const html = data.getData("text/html");

    if (html) {
      const parsed = new DOMParser().parseFromString(html, "text/html");
      console.log("parsed.body", parsed.body);
      const fragment = deserialize(parsed.body);
      console.log("fragment", fragment);
      if (fragment.test === "body" && Array.isArray(fragment.children)) {
        console.log("------插入----");
        const nodes = fragment.children.filter(child => {
          if ('text' in child) {
            return !/^\n+$/.test(child.text)
          }
          return true
        })
        Transforms.insertFragment(editor, nodes);
        return;
      }
      // Transforms.insertFragment(editor, fragment)
    }

    insertData(data);
  };

  return editor;
};

const Element = (props) => {
  const { attributes, children, element } = props;

  switch (element.type) {
    default:
      return <p {...attributes}>{children}</p>;
    case "quote":
      return <blockquote {...attributes}>{children}</blockquote>;
    case "code":
      return (
        <pre>
          <code {...attributes}>{children}</code>
        </pre>
      );
    case "bulleted-list":
      return <ul {...attributes}>{children}</ul>;
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>;
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>;
    case "heading-three":
      return <h3 {...attributes}>{children}</h3>;
    case "heading-four":
      return <h4 {...attributes}>{children}</h4>;
    case "heading-five":
      return <h5 {...attributes}>{children}</h5>;
    case "heading-six":
      return <h6 {...attributes}>{children}</h6>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    case "numbered-list":
      return <ol {...attributes}>{children}</ol>;
    case "link":
      return (
        <a href={element.url} {...attributes}>
          {children}
        </a>
      );
    case "div":
      return <div {...attributes}>{children}</div>;
    case "image":
      return <ImageElement {...props} />;
  }
};

const ImageElement = ({ attributes, children, element }) => {
  const selected = useSelected();
  const focused = useFocused();
  return (
    <div {...attributes}>
      {children}
      <img
        src={element.url}
        className={css`
          display: block;
          max-width: 100%;
          max-height: 20em;
          box-shadow: ${selected && focused ? "0 0 0 2px blue;" : "none"};
        `}
      />
    </div>
  );
};

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  if (leaf.strikethrough) {
    children = <del>{children}</del>;
  }

  return <span {...attributes}>{children}</span>;
};

const initialValue = [
  {
    type: "paragraph",
    children: [
      {
        text: "测试",
      },
    ],
  },
];

export default PasteHtmlExample;
