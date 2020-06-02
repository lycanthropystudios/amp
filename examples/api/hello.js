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
const {setNoCache, setImmutable} = require('@lib/utils/cacheHelpers');

// eslint-disable-next-line new-cap
const examples = express.Router();

examples.get('/hello', (request, response) => {
  setImmutable(response);
  const name = request.query.name;
  if (!name || name.length > 10) {
    response.status(400);
    response.json({error: 'Invalid input'});
    return;
  }
  response.json({
    message: `Hello, ${name}!`,
  });
});

examples.post('/hello', upload.none(), (request, response) => {
  setNoCache(response);
  const name = request.body ? request.body.name : '';
  if (!name || name.length > 10) {
    response.status(400);
    response.json({error: 'Invalid input'});
    return;
  }
  response.json({
    message: `Hello, ${name}!`,
  });
});

module.exports = examples;
