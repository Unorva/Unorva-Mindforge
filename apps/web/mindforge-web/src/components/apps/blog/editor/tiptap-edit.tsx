
import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Underline } from "@tiptap/extension-underline";
import { OrderedList } from "@tiptap/extension-ordered-list";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import { Bold, Code, Italic, Link2, List, ListOrdered, Redo, Underline as UnderlineIcon, Undo, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';

// Add your own styles (optional)
import "./tiptap.css";

const MyEditor = () => {
  const [editorContent, setEditorContent] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Image,
      Underline,
      OrderedList,
      OrderedList,
      BulletList,
      ListItem,
    ],
    content: "<p>Start typing...</p>",
    onUpdate: ({ editor }) => {
      setEditorContent(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Toolbar button click handlers
  const handleBold = () => editor?.chain().focus().toggleBold().run();
  const handleItalic = () => editor?.chain().focus().toggleItalic().run();
  const handleUnderline = () =>
    editor?.chain()?.focus()?.toggleUnderline()?.run();
  const handleH1 = () =>
    editor?.chain().focus().toggleHeading({ level: 1 }).run();
  const handleH2 = () =>
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  const handleH3 = () =>
    editor?.chain().focus().toggleHeading({ level: 3 }).run();
  const handleList = () => editor?.chain().focus().toggleBulletList().run();
  const handleOrderedList = () =>
    editor?.chain().focus().toggleOrderedList().run();
  const handleLink = () => {
    const url = prompt("Enter a URL");
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  };
  const handleImage = () => {
    const url = prompt("Enter image URL");
    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  };
  const handleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run();
  const handleUndo = () => editor?.chain().focus().undo().run();
  const handleRedo = () => editor?.chain().focus().redo().run();

  return (
    <div className="editor-container">
      {/* Toolbar */}
      <ButtonGroup className="toolbar flex-wrap gap-1">
        <Button aria-label="粗体" aria-pressed={editor?.isActive('bold')} onClick={handleBold} size="icon-sm" type="button" variant={editor?.isActive('bold') ? 'secondary' : 'ghost'}><Bold /></Button>
        <Button aria-label="斜体" aria-pressed={editor?.isActive('italic')} onClick={handleItalic} size="icon-sm" type="button" variant={editor?.isActive('italic') ? 'secondary' : 'ghost'}><Italic /></Button>
        <Button aria-label="下划线" aria-pressed={editor?.isActive('underline')} onClick={handleUnderline} size="icon-sm" type="button" variant={editor?.isActive('underline') ? 'secondary' : 'ghost'}><UnderlineIcon /></Button>
        <Button aria-label="一级标题" aria-pressed={editor?.isActive('heading', { level: 1 })} onClick={handleH1} size="sm" type="button" variant={editor?.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}>H1</Button>
        <Button aria-label="二级标题" aria-pressed={editor?.isActive('heading', { level: 2 })} onClick={handleH2} size="sm" type="button" variant={editor?.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}>H2</Button>
        <Button aria-label="三级标题" aria-pressed={editor?.isActive('heading', { level: 3 })} onClick={handleH3} size="sm" type="button" variant={editor?.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}>H3</Button>
        <Button aria-label="无序列表" aria-pressed={editor?.isActive('bulletList')} onClick={handleList} size="icon-sm" type="button" variant={editor?.isActive('bulletList') ? 'secondary' : 'ghost'}><List /></Button>
        <Button aria-label="有序列表" aria-pressed={editor?.isActive('orderedList')} onClick={handleOrderedList} size="icon-sm" type="button" variant={editor?.isActive('orderedList') ? 'secondary' : 'ghost'}><ListOrdered /></Button>
        <Button aria-label="插入链接" onClick={handleLink} size="icon-sm" type="button" variant="ghost"><Link2 /></Button>
        <Button aria-label="插入图片" onClick={handleImage} size="icon-sm" type="button" variant="ghost"><ImageIcon /></Button>
        <Button aria-label="代码块" aria-pressed={editor?.isActive('codeBlock')} onClick={handleCodeBlock} size="icon-sm" type="button" variant={editor?.isActive('codeBlock') ? 'secondary' : 'ghost'}><Code /></Button>
        <Button aria-label="撤销" disabled={!editor?.can().chain().focus().undo().run()} onClick={handleUndo} size="icon-sm" type="button" variant="ghost"><Undo /></Button>
        <Button aria-label="重做" disabled={!editor?.can().chain().focus().redo().run()} onClick={handleRedo} size="icon-sm" type="button" variant="ghost"><Redo /></Button>
      </ButtonGroup>

      {/* Editor content area */}
      <EditorContent editor={editor} />

      {/* Displaying the raw HTML content for testing */}
      <div className="output">
        <h3>Output</h3>
        <div dangerouslySetInnerHTML={{ __html: editorContent }} />
      </div>
    </div>
  );
};

export default MyEditor;
