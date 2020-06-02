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
const cookieParser = require('cookie-parser');
const {setMaxAge} = require('@lib/utils/cacheHelpers');
const SampleRenderer = require('@examples/lib/SampleRenderer');
const {createRequestContext} = require('@lib/templates/index.js');

// eslint-disable-next-line new-cap
const router = express.Router();
router.use(cookieParser());

const MAX_BLOG_ITEMS_NUMBER_PER_PAGE = 5;
const BLOG_ID_PREFIX = 'post';
const IMG_PATH = '/static/samples/img/';
const AMP_LIVE_LIST_COOKIE_NAME = 'ABE_AMP_LIVE_LIST_STATUS';
const EXPIRATION_DATE = 24 * 60 * 60 * 1000; // 1 day in ms
const blogs = [
  newPost(
    'Green landscape',
    'A green landscape with trees.',
    'landscape_green_1280x853.jpg',
    1
  ),
  newPost(
    'Mountains',
    'Mountains reflecting on a lake.',
    'landscape_mountains_1280x657.jpg',
    2
  ),
  newPost(
    'Road leading to a lake',
    'A road leading to a lake with mountains on the back.',
    'landscape_lake_1280x857.jpg',
    3
  ),
  newPost(
    'Forested hills',
    'Forested hills with a grey sky in the background.',
    'landscape_trees_1280x960.jpg',
    4
  ),
  newPost(
    'Scattered houses',
    'Scattered houses in a mountain village.',
    'landscape_village_1280x853.jpg',
    5
  ),
  newPost('Canyon', 'A deep canyon.', 'landscape_canyon_1280x1700.jpg', 6),
  newPost(
    'Desert',
    'A desert with mountains in the background.',
    'landscape_desert_1280x853.jpg',
    7
  ),
  newPost(
    'Houses',
    'Colorful houses on a street.',
    'landscape_houses_1280x803.jpg',
    8
  ),
  newPost(
    'Blue sea',
    'Blue sea surrounding a cave.',
    'landscape_sea_1280x848.jpg',
    9
  ),
  newPost(
    'Sailing ship',
    'A ship sailing the sea at sunset.',
    'landscape_ship_1280x853.jpg',
    10
  ),
];

SampleRenderer.use(router, async (request, response, template) => {
  // set max-age to 15 s - the minimum refresh time for an amp-live-list
  setMaxAge(response, 15);
  const newStatus = await updateStatus(request, response);
  response.send(
    template.render(
      createRequestContext(
        request,
        await createLiveBlogSample(request, newStatus)
      )
    )
  );
});

async function createLiveBlogSample(request, newStatus = 0) {
  if (newStatus > blogs.length) {
    newStatus = blogs.length;
  }
  const origin = request.protocol + '://' + request.get('host');
  // generate random number of 1 to 10 new blog items
  const blogItems = await getBlogEntries(newStatus);
  const firstBlogId = await getFirstBlogId(request);
  const firstItemIndex = await getBlogEntryIndexFromID(firstBlogId, blogItems);
  const lengthCurrentPageBlog = Math.min(
    blogItems.length,
    firstItemIndex + MAX_BLOG_ITEMS_NUMBER_PER_PAGE
  );
  const nextPageId = await getNextPageId(
    firstItemIndex + MAX_BLOG_ITEMS_NUMBER_PER_PAGE,
    blogItems
  );
  const prevPageId = await getPrevPageId(firstItemIndex);
  const prefix = await buildPrefixPaginationUrl(origin, request.baseUrl);
  const nextPageUrl = await buildPaginationURL(prefix, nextPageId);
  const prevPageUrl = await buildPaginationURL(prefix, prevPageId);
  const blogMetaData = await createMetaData(origin, request.baseUrl);
  const disabled = prevPageUrl !== '' ? 'disabled' : '';

  return {
    timestamp: Number(new Date()),
    // send a list of blog items
    blogItems: blogItems.slice(firstItemIndex, lengthCurrentPageBlog),
    pageNumber: await getPageNumberFromProductIndex(firstItemIndex),
    prevPageUrl,
    nextPageUrl,
    blogMetaData,
    disabled,
  };
}

function updateStatus(request, response) {
  const newStatus = readStatus(request) + 1;
  writeStatus(response, newStatus);
  return newStatus;
}

function readStatus(request) {
  const cookie = request.cookies[AMP_LIVE_LIST_COOKIE_NAME];
  if (!cookie) {
    return 0;
  }
  return Number(cookie.value);
}

function writeStatus(response, newValue) {
  response.cookie(
    AMP_LIVE_LIST_COOKIE_NAME,
    {value: newValue},
    {expires: new Date(Date.now() + EXPIRATION_DATE)}
  );
}

function getBlogEntries(size) {
  const returnArray = [];
  for (let i = 0; i < size; i++) {
    returnArray.push(
      newPost(
        blogs[i].heading,
        blogs[i].text,
        blogs[i].img.split(IMG_PATH)[1],
        i + 1
      )
    );
  }
  return returnArray;
}

function buildPrefixPaginationUrl(origin, path) {
  return origin + path + '?from=';
}

function buildPaginationURL(urlPrefix, pageId) {
  if (pageId !== '') {
    return urlPrefix + pageId;
  }
  return '';
}

function getPageNumberFromProductIndex(index) {
  return index / MAX_BLOG_ITEMS_NUMBER_PER_PAGE + 1;
}

function getBlogEntryIndexFromID(id, blogItems = []) {
  if (id > blogItems.length) {
    return 0;
  }
  return id - 1;
}

function getNextPageId(nextPageFirstItemIndex, blogItems = []) {
  if (nextPageFirstItemIndex < blogItems.length) {
    return `${BLOG_ID_PREFIX}${nextPageFirstItemIndex + 1}`;
  }
  return '';
}

function getPrevPageId(firstItemIndex) {
  if (firstItemIndex >= MAX_BLOG_ITEMS_NUMBER_PER_PAGE) {
    return `${BLOG_ID_PREFIX}${
      firstItemIndex - MAX_BLOG_ITEMS_NUMBER_PER_PAGE + 1
    }`;
  }
  return '';
}

function getFirstBlogId(request) {
  const firstItemIndex = !!request.query.from
    ? request.query.from
    : `${BLOG_ID_PREFIX}1`;
  return Number(firstItemIndex.split(BLOG_ID_PREFIX)[1]);
}

function newPost(heading, text, img, id) {
  return {
    heading: heading,
    id: id,
    date: new Date().toLocaleDateString(),
    text: text,
    img: IMG_PATH + img,
    timestamp: Number(new Date()),
  };
}

function createMetaData(origin, baseUrl) {
  const result = [];
  const urlPrefix = origin + baseUrl + '/#';
  for (let i = 0; i < blogs.length; i++) {
    result.push({
      '@type': 'BlogPosting',
      'headline': blogs[i].heading,
      'url': urlPrefix + BLOG_ID_PREFIX + (i + 1),
      'datePublished': blogs[i].timestamp,
      'author': {
        '@type': 'Person',
        'sameAs': 'https://github.com/kul3r4',
        'name': 'Chiara Chiappini',
      },
      'articleBody': 'Text',
      'publisher': {
        '@type': 'Organization',
        'name': 'amp.dev',
        'logo': {
          '@type': 'ImageObject',
          'url': origin + '/img/favicon.png',
          'width': '512',
          'height': '512',
        },
      },
      'image': {
        '@type': 'ImageObject',
        'url': origin + blogs[i].img,
        'width': '853',
        'height': '1280',
      },
    });
  }
  return result;
}

module.exports = router;
