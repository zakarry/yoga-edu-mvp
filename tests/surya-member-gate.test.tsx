import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SuryaMemberGate } from '../src/components/SuryaMemberGate';

(globalThis as unknown as { React: typeof React }).React = React;

const render = (signedIn: boolean, consentVerified: boolean, accountAvailable = true) => renderToStaticMarkup(
  <SuryaMemberGate signedIn={signedIn} consentVerified={consentVerified} accountAvailable={accountAvailable} onOpenAccount={() => {}}>
    <iframe title="member video" src="https://www.youtube.com/embed/mRZ6bczpAgA" />
    <button>protected practice</button>
  </SuryaMemberGate>
);

test('only signed-in members with completed consent receive video and practice', () => {
  for (const [signedIn, consentVerified] of [[false, false], [false, true], [true, false]]) {
    const html = render(signedIn, consentVerified);
    assert.doesNotMatch(html, /iframe|protected practice|youtube\.com/);
  }
  const memberHtml = render(true, true);
  assert.match(memberHtml, /iframe/);
  assert.match(memberHtml, /protected practice/);
  assert.doesNotMatch(memberHtml, /無料会員登録して始める/);
});

test('unconfigured accounts stay locked; signing out removes protected content', () => {
  assert.doesNotMatch(render(false, false, false), /iframe|protected practice/);
  assert.match(render(false, false, false), /現在、会員機能に接続できません/);
  assert.match(render(true, true), /protected practice/);
  assert.doesNotMatch(render(false, false), /protected practice/);
  assert.match(render(false, false), /無料会員登録して始める/);
});
