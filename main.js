$(document).ready(function() {

'use strict';

var constants = {
    notes: [['A'], ['A♯', 'B♭'], ['B'], ['C'], ['C♯', 'D♭'], ['D'], ['D♯', 'E♭'], ['E'], ['F'], ['F♯', 'G♭'], ['G'], ['G♯', 'A♭']],
    chords: {
        'note': new ChordClass('Note', '', []),
        'maj': new ChordClass('Major chord', '', [4, 7]),
        'min': new ChordClass('Minor chord', 'm', [3, 7]),
        '7th': new ChordClass('Dominant 7th chord', '<sup>7</sup>', [4, 10]),
        'dim': new ChordClass('Diminished chord', '<sup>o</sup>', [3, 6])
    }
};

function getNote(i) {
    return ((i % 12) + 12) % 12;
}

function ChordClass(name, symbol, interval) {
    this.name = name;
    this.symbol = symbol;
    this.interval = [0].concat(interval);
}

function ButtonClass(chordClass, offset, name) {
    this.chordClass = chordClass;
    this.offset = offset || 0;
    this.name = name || chordClass.name;
}

function AccordionLayout(columns, hasRow) {
    this.columns = columns;
    this.centerNote = 3;
    this.interval = 7;
    this.rows = [
        new ButtonClass(constants.chords['note'], 4, 'Major 3rd note'),
        new ButtonClass(constants.chords['note'], 0, 'Root note'),
        new ButtonClass(constants.chords['maj']),
        new ButtonClass(constants.chords['min']),
    ];

    if (hasRow['7']) this.rows.push(new ButtonClass(constants.chords['7th']));
    if (hasRow['d']) this.rows.push(new ButtonClass(constants.chords['dim'], 3));
    
    this.chords = {};
    for (var i = 0; i < this.rows.length; i++) {
        var chordClass = this.rows[i].chordClass;
        var name = chordClass.name;
        
        if (!this.chords[name]) this.chords[name] = chordClass;
    }
}

AccordionLayout.prototype = {
    getChordAndRoot: function(i, j) {
        var r = this.rows[i];

        var obj = {};

        obj.chord = r.chordClass;
        obj.root = getNote( this.interval*(1 + j + r.offset - this.centerNote - this.columns / 2) );

        var displaySharpOrFlat;
        if (constants.notes[obj.root][1] && j < this.columns / 2) displaySharpOrFlat = 1;
        else displaySharpOrFlat = 0;

        obj.label = constants.notes[obj.root][displaySharpOrFlat] + r.chordClass.symbol;

        return obj;
    }
};

function ButtonElem(layout, rowIndex, columnIndex) {

    var chordAndRoot = layout.getChordAndRoot(rowIndex, columnIndex);

    this.chord = chordAndRoot.chord;
    this.root = chordAndRoot.root;

    this.div = $('<div>')
        .addClass('acc-button')
        .html('<span>' + chordAndRoot.label + '</span>');
}

ButtonElem.prototype = {
    highlight: function(color) {
        this.div.addClass('acc-button-highlight');
        this.div.attr('data-color', color || 0);
    },
    lowlight: function() {
        this.div.removeClass('acc-button-highlight');
        this.div.removeAttr('data-color');
    }
};

function Buttonboard() {
    var container = $('#buttonboard');

    var buttons = [];
    var layout;

    function setIndentation(amount) {
        var names = container.find('.buttonboard-name');

        var maxWidth = Math.max.apply(null, 
            names.map(function(i) {
                return $(this).width() - i*amount;
            }).get()
        );

        names.each(function(i) {
            $(this).width(maxWidth + i*amount);
        });
    }

    function lowlight() {
        for (var i =0; i < buttons.length; i++) {
            buttons[i].lowlight();
        }
    }

    function init(accordionLayout) {

        container.empty();
        buttons = [];
        layout = accordionLayout;

        for (var i = 0; i < layout.rows.length; i++) {
            var row = $('<div>').addClass('buttonboard-row');

            $('<div>')
                .addClass('buttonboard-name')
                .html(layout.rows[i].name)
                .appendTo(row);

            var buttonsDiv = $('<div>')
                .addClass('buttonboard-buttons')
                .appendTo(row);

            for (var j = 0; j < layout.columns; j++) {
                var button = new ButtonElem(layout, i, j);
                buttons.push(button);
                buttonsDiv.append(button.div);
            }

            container.append(row);
        }
        
        setIndentation(32);

    }
    return {
        init: init,
        lowlight: lowlight,
        highlight: function(chord_arr) {
            lowlight();

            for (var i = 0; i < chord_arr.length; i++) {
                var root = chord_arr[i].root;
                var chord = chord_arr[i].chord;
                
                for (var j = 0; j < buttons.length; j++) {
                    var b = buttons[j];
                    if (b.root === root && b.chord === chord) b.highlight(i);
                }
            }
        },
        doButtonsExist: function(chord_arr) {
            for (var i = 0; i < chord_arr.length; i++) {
                var root = chord_arr[i].root;
                var chord = chord_arr[i].chord;
                
                var found = false;
                for (var j = 0; j < buttons.length; j++) {
                    var b = buttons[j];
                    if (b.root === root && b.chord === chord) {
                        found = true;
                        break;
                    }
                }
                if (!found) return false;
            }
            return true;
        },
        get layout(){return layout;}
    };
}

function ComboSelect(buttonboard, chordfinder, chordplayer) {
    var container = $('#combo-toggles');
    var noFingering = $('#no-fingering').hide();
    var label = $('#fingerings');

    var chordCombos;

    function sortByChordCount(a, b) {
        return a.length - b.length;
    }

    function radioChange() {
        var i = container.find('input:checked').val();
        buttonboard.highlight(chordCombos[i]);
        chordplayer.play(chordCombos[i]);
    }

    function makeRadio(i) {
        var r = $('<label>')
            .addClass('toggle')
            .append(
                $('<input type="radio">').attr('name', 'combo-radio').attr('value', i),
                $('<span>').html('Voicing ' + (i+1))
            )
            .change(radioChange)
            .appendTo(container);
    }

    function initRadios(n) {
        container.empty();
        for (var i = 0; i < n; i++) {
            makeRadio(i);
        }
    }

    return {
        show: function(notes) {
            var combos = [];
            var preCombos = chordfinder.getCombos(notes, buttonboard.layout.chords);

            if (buttonboard.layout.columns < 12) { // layout does not contain all 12 notes
                for (var i = 0; i < preCombos.length; i++) {
                    if (buttonboard.doButtonsExist(preCombos[i])) combos.push(preCombos[i]);
                }
            }
            else combos = preCombos;

            initRadios(combos.length);

            if (combos.length) {
                noFingering.hide();
                label.show();
                chordCombos = combos.sort(sortByChordCount);
                container.find('input').first().prop('checked', true).change();
            }
            else {
                noFingering.show();
                label.hide();
                buttonboard.lowlight();
            }
        },
        hide: function() {
            initRadios(0);
            noFingering.hide();
            label.hide();
            buttonboard.lowlight();
        }
    };
}

function NoteSelect(comboSelect) {
    var container = $('#note-toggles');

    function checkboxChange(e) {

        var notes = container.find('input:checked')
            .map(function(){ 
                return Number($(this).val());
            })
            .get();

        if (notes.length) {
            comboSelect.show(notes);
        }
        else {
            comboSelect.hide();
        }
    }

    function makeCheckbox(value, label){
        $('<label>')
            .addClass('toggle')
            .append(
                $('<input type="checkbox">').attr('value', value),
                $('<span>').html(label)
            )
            .change(checkboxChange)
            .appendTo(container);
    }

    function init() {
        for (var i = 0; i < constants.notes.length; i++) {

            var note = constants.notes[i];
            var value = i;
            var label = note[0] + (note[1] ? '/' + note[1] : '');
            makeCheckbox(value, label);
        }
    }

    init();

    return {
        deselectAll: function() {
            container.find('input:checked').prop('checked', false);
            checkboxChange();
        }
    };
}

function AccordionLayoutSelect(buttonboard, noteSelect) {
    var select = $('#accordion-layout-selector');
    var layouts = {
            '40-bass': [8, {'7': true}],
            '48-bass (full)': [8, {'7': true, 'd': true}],
            '48-bass': [12, {}],
            '60-bass': [12, {'7': true}],
            '72-bass': [12, {'7': true, 'd': true}],
            '80-bass': [16, {'7': true}],
            '96-bass': [16, {'7': true, 'd': true}],
            '120-bass': [20, {'7': true, 'd': true}]
    };

    select.change(function() {
        noteSelect.deselectAll();
        var v = select.val();
        buttonboard.init(new AccordionLayout(layouts[v][0], layouts[v][1]));
    });

    function init() {

        for (var l in layouts) {
            $('<option>')
                .attr('value', l)
                .html(l)
                .appendTo(select);
        }

        select.val('120-bass').change();
    }

    init();
}

function Chordfinder() {

    function isChordInNotes(noteObj, interval, rootNote) {
        for (var i = 0; i < interval.length; i++) {
            if (!noteObj[getNote(rootNote + interval[i])]) return false;
        }

        return true;
    }

    function chordsContainedInNotes(noteObj, chords) {
        var matches = [];

        for (var c in chords) {
            var interval = chords[c].interval;
            
            for (var n = 0; n < constants.notes.length; n++) {
                if (isChordInNotes(noteObj, interval, n)) {
                    
                    matches.push({
                        chord: chords[c],
                        root: n
                    });
                }
            }
        }

        return matches;
    }

    function necessaryAndSufficient(combo, numNotes) {
        if (combo.length > 3) return false;

        var matched = {};
        var matchCount = 0;

        for (var i = 0; i < combo.length; i++) {
            var interval = combo[i].chord.interval;

            for (var j = 0; j < interval.length; j++) {
                var note = getNote(combo[i].root + interval[j]);
                
                if (!matched[note]) {
                    matched[note] = 1;
                    matchCount++;
                }

                else matched[note]++;
            }
        }

        if (matchCount !== numNotes) return 's'; // not sufficient

        var necessaryChords = 0;

        for (var i = 0; i < combo.length; i++) {
            var interval = combo[i].chord.interval;

            for (var j = 0; j < interval.length; j++) {
                var note = getNote(combo[i].root + interval[j]);
                
                if (matched[note] === 1) {
                    necessaryChords++;
                    break;
                }
            }
        }

        if (combo.length !== necessaryChords) return 'n'; // not necessary

        return true;
    }

    function findValidCombos(chordMatches, numNotes) {
        var combos = [];

        function recurse(curCombo, curIndex) {

            var ns = necessaryAndSufficient(curCombo, numNotes);

            if (ns === true) combos.push(curCombo);

            if (ns !== 's') return;

            for (var i = curIndex; i < chordMatches.length; i++) {
                recurse(curCombo.concat(chordMatches[i]), i+1);      
            }
        }

        if (chordMatches.length) recurse([], 0);

        return combos;
    }

    return {
        getCombos: function(notes, chords) {

            var noteObj = {};
            for (var i = 0; i < notes.length; i++) {
                noteObj[notes[i]] = true;
            }

            var chordMatches = chordsContainedInNotes(noteObj, chords);
            var combos = findValidCombos(chordMatches, notes.length);

            return combos;
        }
    };
}


function Chordplayer() {
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)(),
        noteDuration = 2,
        rootNote = 0,
        decay,
        soundToggle = $('#sound-toggle');

    function getFrequency(note, octave) {
        var freqIndex = (12*octave + getNote(note - rootNote) + rootNote - 12);
        return 440 * Math.pow(2,  freqIndex / 12);
    }

    function init(numTones) {

        // mute the previously sounding chord
        if (decay) {
            decay.gain.cancelScheduledValues(audioCtx.currentTime);
            decay.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.25);
            // decay.disconnect();
        } 

        decay = audioCtx.createGain();
        decay.connect(audioCtx.destination);

        var scale = 0.5 / Math.sqrt(numTones);

        // fade in
        // decay.gain.setValueAtTime(0, audioCtx.currentTime);
        // decay.gain.linearRampToValueAtTime(scale, audioCtx.currentTime + 0.1);

        decay.gain.setValueAtTime(scale, audioCtx.currentTime);

        decay.gain.linearRampToValueAtTime(0, audioCtx.currentTime + noteDuration);
    }

    function playNote(note, octave) {
        var o = audioCtx.createOscillator();
        o.frequency.value = getFrequency(note, octave, 0);
        o.type = 'triangle';
        o.connect(decay);

        o.start();
        o.stop(audioCtx.currentTime + 2*noteDuration);
    }

    return {
        play: function(chordCombo) {
            if (!soundToggle.prop('checked')) return;

            var noteMap = {
                lowOctave: {},
                highOctave: {}
            };

            for (var i = 0; i < chordCombo.length; i++) {
                var chord = chordCombo[i];

                if (chord.chord.name === 'Note') {
                    noteMap.lowOctave[chord.root] = true;
                }
                else {
                    var interval = chord.chord.interval;
                    for (var j = 0; j < interval.length; j++) {
                        noteMap.highOctave[getNote(chord.root + interval[j])] = true;
                    }
                }
            }

            var numTones = Object.keys(noteMap.lowOctave).length + Object.keys(noteMap.highOctave).length;
            init(numTones);

            for (var n in noteMap.lowOctave) {
                playNote(n, -1);
            }
            for (var n in noteMap.highOctave) {
                playNote(n, 0);
            }
        }
    };
}

var buttonboard = Buttonboard();
var chordfinder = Chordfinder();
var chordplayer = Chordplayer();
var comboSelect = ComboSelect(buttonboard, chordfinder, chordplayer);
var noteSelect = NoteSelect(comboSelect);
AccordionLayoutSelect(buttonboard, noteSelect);

});