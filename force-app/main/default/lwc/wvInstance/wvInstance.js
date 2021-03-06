import { LightningElement, wire, track, api } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import libUrl from '@salesforce/resourceUrl/lib';
import myfilesUrl from '@salesforce/resourceUrl/myfiles';
/** ContentVersionController.getFileBlobById(id) Apex method */
import getFileBlobById from '@salesforce/apex/ContentVersionController.getFileBlobById';

/** ContentVersionController.createContenVersion(filename, base64Data, fileType, contentDocumentId) Apex method */
import createContenVersion from '@salesforce/apex/ContentVersionController.createContenVersion';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import mimeTypes from './mimeTypes'

function _base64ToArrayBuffer(base64) {
  var binary_string =  window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array( len );
  for (var i = 0; i < len; i++)        {
      bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}


export default class WvInstance extends LightningElement {
  source = 'My file';
  fullAPI = false;
  @track
  contentVersionId = '';

  @wire(CurrentPageReference)
  currentPageReference;

  get contentVersionIdFromState(){
    return this.currentPageReference && this.currentPageReference.state.c__contentVersionId;
  }

  connectedCallback() {
    this.showErrorMessage = this.showErrorMessage.bind(this);

    // Add event listener from WebViewer iframe
    window.addEventListener('message', this.handleReceiveMessage.bind(this), false);
  }
  disconnectedCallback() {

    // Remove event listener from WebViewer iframe
    window.removeEventListener('message', this.handleReceiveMessage, true);
  }

  handleReceiveMessage(event) {
    const me = this;
    if (event.isTrusted && typeof event.data === 'object') {
      switch (event.data.type) {
        case 'SAVE_DOCUMENT':
          // Call Apex API to save PDF to ContentVersion
          console.log('Save PDF', event.data.payload.filename)
          createContenVersion(event.data.payload).then((response) => {
            me.iframeWindow.postMessage({type: 'DOCUMENT_SAVED', response }, '*')
          }).catch(this.showErrorMessage);
          break;
        default:
          break;
      }
    }
  }

  showErrorMessage(error) {
    if (!error)  {
      // eslint-disable-next-line no-console
      console.error(error);
      return;
    }

    console.error(error);

    this.dispatchEvent(
      new ShowToastEvent({
        title: 'Error in WebViewer',
        message: error.body.message || 'error',
        variant: 'error',
      }),
    );
  }


  renderedCallback() {
    this.contentVersionId = this.contentVersionIdFromState;

    var self = this;
    if (this.uiInitialized) {
        return;
    }
    this.uiInitialized = true;

    Promise.all([
        loadScript(self, libUrl + '/webviewer.min.js')
    ])
    .then(() => this.initUI())
    .catch(this.showErrorMessage);
  }

  initUI() {
    let _this = this;
    var myObj = {
      libUrl: libUrl,
      fullAPI: this.fullAPI || false,
      namespacePrefix: '',
    };
    // var url = myfilesUrl + '/webviewer-demo-annotated.pdf';

    const viewerElement = this.template.querySelector('div')
    // eslint-disable-next-line no-unused-vars
    const viewer = new PDFTron.WebViewer({
      path: libUrl, // path to the PDFTron 'lib' folder on your server
      custom: JSON.stringify(myObj),
      // initialDoc: url,
      backendType: 'ems',
      // preloadWorker: 'all',
      config: myfilesUrl + '/config.js',
      fullAPI: this.fullAPI,
      enableFilePicker: this.enableFilePicker,
      enableRedaction: this.enableRedaction,
      enableMeasurement: this.enableMeasurement,
    }, viewerElement);

    viewerElement.addEventListener('ready', () => {
      this.iframeWindow = viewerElement.querySelector('iframe').contentWindow;
      this.openFile(this.contentVersionId)
    })

  }

  openFile(Id) {
    getFileBlobById({ Id }).then(response => {
      const  { Title, FileExtension, Content, ContentDocumentId } = response

      const filename = `${Title}.${FileExtension}`;
      var blob = new Blob([_base64ToArrayBuffer(Content)], {
        type: mimeTypes[FileExtension]
      });

      const payload = {
        blob: blob,
        filename: filename,
        extension: FileExtension,
        contentVersionId: this.contentVersionId,
        contentDocumentId: ContentDocumentId
      }

      this.iframeWindow.postMessage({type: 'OPEN_DOCUMENT_BLOB', payload }, '*')
    })
    .catch(this.showErrorMessage);
  }

  @api
  openDocument() {
    this.contentVersionId = this.contentVersionIdFromState;
    this.openFile(this.contentVersionId)
  }

  @api
  closeDocument() {
    this.iframeWindow.postMessage({type: 'CLOSE_DOCUMENT' }, '*')
  }
}