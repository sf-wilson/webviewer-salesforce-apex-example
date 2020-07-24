var resourceURL = '/resource/'
window.CoreControls.forceBackendType('ems');

var urlSearch = new URLSearchParams(location.hash)
var custom = JSON.parse(urlSearch.get('custom'));
resourceURL = resourceURL + custom.namespacePrefix;

// office workers
window.CoreControls.setOfficeWorkerPath(resourceURL + 'office')
window.CoreControls.setOfficeAsmPath(resourceURL + 'office_asm');
window.CoreControls.setOfficeResourcePath(resourceURL + 'office_resource');

// pdf workers
window.CoreControls.setPDFResourcePath(resourceURL + 'resource')
if (custom.fullAPI) {
  window.CoreControls.setPDFWorkerPath(resourceURL+ 'pdf_full')
  window.CoreControls.setPDFAsmPath(resourceURL +'asm_full');
} else {
  window.CoreControls.setPDFWorkerPath(resourceURL+ 'pdf_lean')
  window.CoreControls.setPDFAsmPath(resourceURL +'asm_lean');
}

// external 3rd party libraries
window.CoreControls.setExternalPath(resourceURL + 'external')
window.CoreControls.setCustomFontURL('https://pdftron.s3.amazonaws.com/custom/ID-zJWLuhTffd3c/vlocity/webfontsv20/');



window.addEventListener("message", receiveMessage, false);

function receiveMessage(event) {
  if (event.isTrusted && typeof event.data === 'object') {
    switch (event.data.type) {
      case 'OPEN_DOCUMENT':
        event.target.readerControl.loadDocument(event.data.file)
        break;
      case 'OPEN_DOCUMENT_BLOB':
        const { blob, extension, filename, documentId } = event.data.payload;
        event.target.readerControl.loadDocument(blob, { extension, filename, documentId })
        break;
      case 'CLOSE_DOCUMENT':
        event.target.readerControl.closeDocument()
        break;
      default:
        break;
    }
  }
}




// Post message to LWC/parent app

async function saveDocument(payload) {
  const doc = docViewer.getDocument();
  const xfdfString = await docViewer.getAnnotationManager.exportAnnotations();
  const data = await doc.getFileData({
    // saves the document with annotations in it
    xfdfString
  });
  const arr = new Uint8Array(data);
  const blob = new Blob([arr], { type: 'application/pdf' });

  // Convert blob to base64 for ContentVersion
  var reader = new FileReader();
  reader.readAsDataURL(blob); 
  reader.onloadend = function() {
      var base64data = reader.result;                
      console.log(base64data);
      var payload = {
        VersionData: base64data,
        //...
      }
      parent.postMessage({type: 'SAVE_DOCUMENT', payload }, '*'); // <---- post message to LWC
  }
  
}