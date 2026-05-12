import EditorJS from '@editorjs/editorjs';
import ExternalItemPickerTool from '../../src';
import '../../src/styles.css';

const editor = new EditorJS({
  holder: 'editorjs',
  inlineToolbar: ['dynamicLink'],
  tools: {
    dynamicLink: {
      class: ExternalItemPickerTool,
      inlineToolbar: true,
      config: {
        endpoints: {
          categories: '/mock/categories.json',
          itemsByCategory: '/mock/items-{category}.json'
        }
      }
    }
  },
  data: {
    blocks: [
      {
        type: 'paragraph',
        data: {
          text: 'Select text in this paragraph and use the dynamic link inline tool.'
        }
      }
    ]
  }
});

document.querySelector<HTMLButtonElement>('#save')?.addEventListener('click', async () => {
  const output = await editor.save();
  const outputElement = document.querySelector<HTMLPreElement>('#output');

  if (outputElement) {
    outputElement.textContent = JSON.stringify(output, null, 2);
  }
});
