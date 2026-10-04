<script setup>
import { computed } from 'vue'
import { Ckeditor } from '@ckeditor/ckeditor5-vue'
import {
  BlockQuote, Bold, ClassicEditor, Essentials, Heading, Italic, Link, List, Paragraph, Table, TableToolbar, Undo,
} from 'ckeditor5'
import 'ckeditor5/ckeditor5.css'

// CKEditor 5 (GPL build, JavaScript). The toolbar offers only what the backend's sanitizer
// keeps: paragraphs, h2-h4, bold, italic, links, lists, block quotes and tables. The editor is
// a convenience: the BACKEND sanitizes every lesson on save and remains the authority, so
// nothing here is trusted for safety.
const props = defineProps({
  label: { type: String, default: 'Lesson content' },
})

const model = defineModel({ type: String, default: '' })

const config = computed(() => ({
  licenseKey: 'GPL',
  label: props.label,
  plugins: [Essentials, Paragraph, Heading, Bold, Italic, Link, List, BlockQuote, Table, TableToolbar, Undo],
  toolbar: ['undo', 'redo', '|', 'heading', '|', 'bold', 'italic', 'link', '|', 'bulletedList', 'numberedList', 'blockQuote', 'insertTable'],
  heading: {
    options: [
      { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
      { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
      { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
    ],
  },
  table: { contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'] },
  link: { defaultProtocol: 'https://' },
}))

// The Vue wrapper debounces its own v-model updates by 300 ms, so text typed just before
// clicking "Save" would be missing from the form. When the editor loses focus (which always
// happens before a click on Save, or any other control) the current content is copied over.
// It must NOT be copied on every keystroke: the wrapper would treat that as an outside change
// and reset the editing position.
const onBlur = (_event, editor) => {
  model.value = editor.getData()
}
</script>

<template>
  <div class="lesson-editor">
    <Ckeditor v-model="model" :editor="ClassicEditor" :config="config" @blur="onBlur" />
  </div>
</template>

<style>
/* The editor is framed like the other form controls (same radius, border and focus colour), with
   a comfortable editing area and content styles that match what students will read. On a narrow
   screen CKEditor folds toolbar buttons into its own "show more" menu, so it never overflows. */
.lesson-editor {
  --ck-border-radius: var(--radius-sm);
  --ck-color-base-border: var(--line-strong);
  --ck-color-focus-border: var(--primary);
  --ck-color-text: var(--ink);
  --ck-font-face: inherit;
  max-width: 100%;
}

.lesson-editor .ck-editor__editable_inline {
  min-height: 14rem;
  padding: 0.75rem 1rem;
  font-family: var(--font-display);
  font-size: 1.25rem;
  line-height: 1.7;
}

.lesson-editor .ck-content h2 { font-size: 1.5em; font-weight: 600; }
.lesson-editor .ck-content h3 { font-size: 1.25em; font-weight: 600; }
.lesson-editor .ck-content h4 { font-size: 1.1em; font-weight: 600; }
</style>
