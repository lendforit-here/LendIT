// ===== EDIT THE ROSTER HERE =====
// Order on screen: Mem 1 | Mem 2 | Leader | Mem 3 | Mem 4
(function () {
  var TEAM = [
    { role: 'Member',      name: 'MATTHEW JIMI T. PIEDAD',  photo: '../images/team/team1.jpg' },
    { role: 'Member',      name: 'SID AUDREY T. SANTOS',    photo: '../images/team/team2.jpg' },
    { role: 'Team Leader', name: 'MARIA CHEMAINE T. MESA',  photo: '../images/team/team3.jpg', leader: true },
    { role: 'Member',      name: 'JANELLE CRISHA C. MELCHOR', photo: '../images/team/team4.jpg' },
    { role: 'Member',      name: 'MIC ANDRE M. GAWAT',           photo: '../images/team/team5.jpg' }
  ];
  var html = TEAM.map(function (m) {
    return '<figure class="ab-card' + (m.leader ? ' leader' : '') + '">' +
      '<div class="ab-photo"><img src="' + m.photo + '" alt="' + m.name + '"></div>' +
      '<figcaption><span class="ab-role">' + m.role + '</span><span class="ab-name">' + m.name + '</span></figcaption>' +
      '</figure>';
  }).join('');
  document.getElementById('roster').innerHTML = html;
})();
