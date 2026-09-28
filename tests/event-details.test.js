'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');

for(const text of [
  '10:45 AM',
  '11:00 AM',
  '12:00 PM',
  '12:30 PM',
  '1:30 PM',
  '2:00 PM',
  'two back-to-back sessions',
  'Group A Escapes · Group B Lounge',
  'Group B Escapes · Group A Lounge',
  'Digital Waiver & Game Ready',
  'room-specific digital waiver links',
  'Guests will purchase their own drinks',
  'team of up to six and a team name'
]){
  assert(html.includes(text),'Missing confirmed event detail: '+text);
}

for(const obsolete of ['11:30 AM','12:45 PM','12:50 PM']){
  assert(!html.includes(obsolete),'Obsolete programme time still present: '+obsolete);
}

assert(!html.includes('$1500'),'Internal venue cost must not be published in the invitation');
assert(!html.includes('$750'),'Internal deposit must not be published in the invitation');
assert(!html.includes('14 Days in advance'),'Internal cancellation terms must not be published in the invitation');

console.log('Event details tests passed: confirmed two-session programme and attendee guidance are present.');
