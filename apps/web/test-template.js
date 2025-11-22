const html = `
      <div class="relative min-h-screen">
        <div>Content</div>
      </div>
    `;

const temp = document.createElement('template');
temp.innerHTML = html;
console.log('childElementCount:', temp.content.childElementCount);
console.log('childNodes length:', temp.content.childNodes.length);
temp.content.childNodes.forEach((node, i) => {
  console.log(`Node ${i}:`, node.nodeType, node.nodeName, node.textContent?.trim() || '(empty)');
});
