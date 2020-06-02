/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const express = require('express');
const multer = require('multer');
const upload = multer();

// eslint-disable-next-line new-cap
const examples = express.Router();

examples.post(['/default', '/postal', '/phone'], upload.none(), handleRequest);

function handleRequest(request, response) {
  const code = request.body ? request.body['code'] : '';
  const codeUnmasked = request.body ? request.body['code-unmasked'] : '';
  response.json({
    code,
    'code-unmasked': codeUnmasked,
  });
}

module.exports = examples;
