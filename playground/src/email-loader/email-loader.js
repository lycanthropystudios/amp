// Copyright 2019 The AMPHTML Authors
//
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as quotedPrintable from 'quoted-printable';

export function createEmailLoader(editor) {
  return new EmailLoader(editor);
}

class EmailLoader {
  constructor(editor) {
    this.editor = editor;
  }

  async loadEmailFromFile() {
    const files = await new Promise((resolve) => {
      const dialog = document.createElement('input');
      dialog.setAttribute('type', 'file');
      dialog.setAttribute('accept', '.eml');
      dialog.addEventListener('change', () => resolve(dialog.files));
      dialog.click();
    });
    if (files.length !== 1) {
      throw new Error('You must select a file');
    }
    const data = await files[0].text();
    this._loadEmail(data);
  }

  _loadEmail(emailCode) {
    emailCode = emailCode.replace(/\r\n/g, '\n');
    const [head, body] = twoSplit(emailCode, '\n\n');
    if (!body) {
      throw new Error('No body found in email');
    }

    const {parts, contentType} = this._parseMultipart(head, body);
    if (contentType !== 'multipart/alternative') {
      throw new Error('Email is not multipart/alternative');
    }

    const ampPart = parts.find((part) =>
      part.contentType.startsWith('text/x-amp-html')
    );
    if (!ampPart) {
      throw new Error('No AMP part found in multipart/alternative');
    }
    this.editor.setSource(ampPart.body);
  }

  _parseMultipart(head, body) {
    const headers = this._parseHeaders(head);
    const {contentType, boundary} = this._parseMultipartContentType(
      headers.get('content-type')
    );
    const parts = this._parseMultipartBody(body, boundary);
    return {
      contentType,
      parts,
    };
  }

  _parseHeaders(head) {
    const lines = head.split('\n');
    let current = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.match(/^\s/)) {
        current = i;
        continue;
      }
      lines[current] += ' ' + line.trim();
      lines[i] = null;
    }

    return new Map(
      lines
        .filter((line) => line)
        .map((line) => {
          const [key, value] = twoSplit(line, ':');
          return [key.toLowerCase(), value.trim()];
        })
    );
  }

  _parseMultipartBody(body, boundary) {
    const rawParts = body.split('--' + boundary);
    if (
      rawParts[0].trim() !== '' ||
      rawParts[rawParts.length - 1].trim() !== '--'
    ) {
      throw new Error('Invalid multipart body');
    }
    const parts = rawParts.slice(1, -1);

    return parts.map((part) => {
      let [head, body] = twoSplit(part, '\n\n');
      if (!body) {
        throw new Error('No body found in email part');
      }
      const headers = this._parseHeaders(head);
      const encoding = headers.get('content-transfer-encoding');
      switch (encoding) {
        case 'base64':
          body = atob(body.replace(/\s/g, ''));
          break;
        case 'quoted-printable':
          body = quotedPrintable.decode(body.replace('=E2=9A=A1', '⚡'));
          break;
      }
      return {
        contentType: headers.get('content-type') || '',
        body,
      };
    });
  }

  _parseMultipartContentType(contentTypeHeader) {
    const parts = (contentTypeHeader || '').split(/\s*;\s*/);
    const contentType = parts[0].trim();
    if (!contentType.startsWith('multipart/')) {
      throw new Error('Invalid content type: not multipart');
    }
    const params = Object.create(null);
    for (let i = 1; i < parts.length; i++) {
      let [key, value] = twoSplit(parts[i], /\s*=\s*/);
      if (!key || !value) {
        continue;
      }
      key = key.toLowerCase();
      if (value.startsWith('"')) {
        value = JSON.parse(value);
      }
      params[key] = value;
    }
    if (!params.boundary) {
      throw new Error('Invalid content type: no valid boundary in multipart');
    }
    return {
      contentType,
      boundary: params.boundary,
    };
  }
}

// like String.prototype.split, but returns only two parts
function twoSplit(str, separator) {
  const pos =
    separator instanceof RegExp
      ? str.search(separator)
      : str.indexOf(separator);
  if (pos === -1) {
    return [str];
  }
  return [str.substring(0, pos), str.substring(pos).replace(separator, '')];
}
