var d = require('../libjs/durable');

d.statechart('missManners', function() {
    ready: {
        to: 'start'
        whenAll: m.t == 'lastSeat' 
        run: { s.startTime = new Date(); }
    }

    start: {
        to: 'assign'
        whenAll: m.t == 'guest' 
        run: {
            s.count = 0;
            assert({ t: 'seating',
                     tid: s.count,
                     pid: 0,
                     path: true,
                     leftSeat: 1,
                     leftGuestName: m.name,
                     rightSeat: 1,
                     rightGuestName: m.name });
            assert({ t: 'path',
                     pid: s.count,
                     seat: 1,
                     guestName: m.name });
            s.count += 1;
            console.log('assign ' + c.m.name);
        }
    }

    assign: {
        to: 'make'
        whenAll: {
            seating = m.t == 'seating' && m.path == true
            rightGuest = m.t == 'guest' && m.name == seating.rightGuestName
            leftGuest = m.t == 'guest' && m.sex != rightGuest.sex && m.hobby == rightGuest.hobby
            none(m.t == 'path' && m.pid == seating.tid && m.guestName ==leftGuest.name)
            none(m.t == 'chosen' && m.cid == seating.tid && m.guestName == leftGuest.name && m.hobby == rightGuest.hobby)
        } 
        run: {
            assert({ t: 'seating',
                     tid: s.count,
                     pid: seating.tid,
                     path: false,
                     leftSeat: seating.rightSeat,
                     leftGuestName: seating.rightGuestName,
                     rightSeat: seating.rightSeat + 1,
                     rightGuestName: leftGuest.name });
            assert({ t: 'path',
                     pid: s.count,
                     seat: seating.rightSeat + 1,
                     guestName: leftGuest.name });
            assert({ t: 'chosen',
                     cid: seating.tid,
                     guestName: leftGuest.name,
                     hobby: rightGuest.hobby });
            s.count += 1;
        } 
    }

    make: {
        to: 'make'
        whenAll: {
            seating = m.t == 'seating' && m.path == false
            path = m.t == 'path' && m.pid == seating.pid
            none(m.t == 'path' && m.pid == seating.tid && m.guestName == path.guestName)
        }
        cap: 1000
        run: {
            for (var i = 0; i < m.width; ++i) {
                var frame = m[i];
                assert({ t: 'path',
                         pid: frame.seating.tid,
                         seat: frame.path.seat,
                         guestName: frame.path.guestName });
            }
        }

        to: 'check'
        whenAll: m.t == 'seating' && m.path == false
        pri: 1
        run: {
            retract(m);
            delete(m.id);
            m.path = true;
            assert(m);
            console.log('path sid: ' + m.tid + ', pid: ' + m.pid + ', left: ' + m.leftGuestName + ', right: ' + m.rightGuestName);
        }
    }

    check: {
        to: 'end'
        whenAll: {
            lastSeat = m.t == 'lastSeat'
            m.t == 'seating' && m.rightSeat == lastSeat.seat
        } 
        run: {
            console.log('end ' + (new Date() - s.startTime));
            deleteState();
        }

        to: 'assign'
    }
    
    end: {}
});

d.assert('missManners', {id: 1, sid: 1, t: 'guest', name: '1', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 2, sid: 1, t: 'guest', name: '1', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 3, sid: 1, t: 'guest', name: '1', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 4, sid: 1, t: 'guest', name: '1', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 5, sid: 1, t: 'guest', name: '1', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 6, sid: 1, t: 'guest', name: '2', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 7, sid: 1, t: 'guest', name: '2', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 8, sid: 1, t: 'guest', name: '2', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 9, sid: 1, t: 'guest', name: '2', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 10, sid: 1, t: 'guest', name: '2', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 11, sid: 1, t: 'guest', name: '3', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 12, sid: 1, t: 'guest', name: '3', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 13, sid: 1, t: 'guest', name: '3', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 14, sid: 1, t: 'guest', name: '4', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 15, sid: 1, t: 'guest', name: '4', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 16, sid: 1, t: 'guest', name: '4', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 17, sid: 1, t: 'guest', name: '4', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 18, sid: 1, t: 'guest', name: '5', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 19, sid: 1, t: 'guest', name: '5', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 20, sid: 1, t: 'guest', name: '5', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 21, sid: 1, t: 'guest', name: '6', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 22, sid: 1, t: 'guest', name: '6', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 23, sid: 1, t: 'guest', name: '6', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 24, sid: 1, t: 'guest', name: '6', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 25, sid: 1, t: 'guest', name: '6', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 26, sid: 1, t: 'guest', name: '7', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 27, sid: 1, t: 'guest', name: '7', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 28, sid: 1, t: 'guest', name: '7', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 29, sid: 1, t: 'guest', name: '7', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 30, sid: 1, t: 'guest', name: '8', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 31, sid: 1, t: 'guest', name: '8', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 32, sid: 1, t: 'guest', name: '9', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 33, sid: 1, t: 'guest', name: '9', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 34, sid: 1, t: 'guest', name: '9', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 35, sid: 1, t: 'guest', name: '9', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 36, sid: 1, t: 'guest', name: '10', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 37, sid: 1, t: 'guest', name: '10', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 38, sid: 1, t: 'guest', name: '10', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 39, sid: 1, t: 'guest', name: '10', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 40, sid: 1, t: 'guest', name: '10', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 41, sid: 1, t: 'guest', name: '11', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 42, sid: 1, t: 'guest', name: '11', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 43, sid: 1, t: 'guest', name: '11', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 44, sid: 1, t: 'guest', name: '11', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 45, sid: 1, t: 'guest', name: '12', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 46, sid: 1, t: 'guest', name: '12', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 47, sid: 1, t: 'guest', name: '12', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 48, sid: 1, t: 'guest', name: '13', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 49, sid: 1, t: 'guest', name: '13', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 50, sid: 1, t: 'guest', name: '14', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 51, sid: 1, t: 'guest', name: '14', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 52, sid: 1, t: 'guest', name: '14', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 53, sid: 1, t: 'guest', name: '14', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 54, sid: 1, t: 'guest', name: '15', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 55, sid: 1, t: 'guest', name: '15', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 56, sid: 1, t: 'guest', name: '15', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 57, sid: 1, t: 'guest', name: '15', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 58, sid: 1, t: 'guest', name: '15', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 59, sid: 1, t: 'guest', name: '16', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 60, sid: 1, t: 'guest', name: '16', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 61, sid: 1, t: 'guest', name: '16', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 62, sid: 1, t: 'guest', name: '17', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 63, sid: 1, t: 'guest', name: '17', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 64, sid: 1, t: 'guest', name: '18', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 65, sid: 1, t: 'guest', name: '18', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 66, sid: 1, t: 'guest', name: '18', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 67, sid: 1, t: 'guest', name: '18', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 68, sid: 1, t: 'guest', name: '19', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 69, sid: 1, t: 'guest', name: '19', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 70, sid: 1, t: 'guest', name: '20', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 71, sid: 1, t: 'guest', name: '20', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 72, sid: 1, t: 'guest', name: '21', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 73, sid: 1, t: 'guest', name: '21', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 74, sid: 1, t: 'guest', name: '21', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 75, sid: 1, t: 'guest', name: '21', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 76, sid: 1, t: 'guest', name: '22', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 77, sid: 1, t: 'guest', name: '22', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 78, sid: 1, t: 'guest', name: '22', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 79, sid: 1, t: 'guest', name: '23', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 80, sid: 1, t: 'guest', name: '23', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 81, sid: 1, t: 'guest', name: '23', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 82, sid: 1, t: 'guest', name: '24', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 83, sid: 1, t: 'guest', name: '24', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 84, sid: 1, t: 'guest', name: '24', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 85, sid: 1, t: 'guest', name: '24', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 86, sid: 1, t: 'guest', name: '24', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 87, sid: 1, t: 'guest', name: '25', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 88, sid: 1, t: 'guest', name: '25', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 89, sid: 1, t: 'guest', name: '26', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 90, sid: 1, t: 'guest', name: '26', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 91, sid: 1, t: 'guest', name: '27', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 92, sid: 1, t: 'guest', name: '27', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 93, sid: 1, t: 'guest', name: '27', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 94, sid: 1, t: 'guest', name: '28', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 95, sid: 1, t: 'guest', name: '28', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 96, sid: 1, t: 'guest', name: '28', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 97, sid: 1, t: 'guest', name: '28', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 98, sid: 1, t: 'guest', name: '28', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 99, sid: 1, t: 'guest', name: '29', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 100, sid: 1, t: 'guest', name: '29', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 101, sid: 1, t: 'guest', name: '30', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 102, sid: 1, t: 'guest', name: '30', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 103, sid: 1, t: 'guest', name: '31', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 104, sid: 1, t: 'guest', name: '31', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 105, sid: 1, t: 'guest', name: '31', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 106, sid: 1, t: 'guest', name: '32', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 107, sid: 1, t: 'guest', name: '32', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 108, sid: 1, t: 'guest', name: '32', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 109, sid: 1, t: 'guest', name: '33', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 110, sid: 1, t: 'guest', name: '33', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 111, sid: 1, t: 'guest', name: '34', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 112, sid: 1, t: 'guest', name: '34', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 113, sid: 1, t: 'guest', name: '34', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 114, sid: 1, t: 'guest', name: '35', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 115, sid: 1, t: 'guest', name: '35', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 116, sid: 1, t: 'guest', name: '35', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 117, sid: 1, t: 'guest', name: '35', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 118, sid: 1, t: 'guest', name: '35', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 119, sid: 1, t: 'guest', name: '36', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 120, sid: 1, t: 'guest', name: '36', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 121, sid: 1, t: 'guest', name: '36', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 122, sid: 1, t: 'guest', name: '36', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 123, sid: 1, t: 'guest', name: '37', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 124, sid: 1, t: 'guest', name: '37', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 125, sid: 1, t: 'guest', name: '37', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 126, sid: 1, t: 'guest', name: '38', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 127, sid: 1, t: 'guest', name: '38', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 128, sid: 1, t: 'guest', name: '38', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 129, sid: 1, t: 'guest', name: '38', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 130, sid: 1, t: 'guest', name: '39', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 131, sid: 1, t: 'guest', name: '39', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 132, sid: 1, t: 'guest', name: '40', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 133, sid: 1, t: 'guest', name: '40', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 134, sid: 1, t: 'guest', name: '41', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 135, sid: 1, t: 'guest', name: '41', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 136, sid: 1, t: 'guest', name: '42', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 137, sid: 1, t: 'guest', name: '42', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 138, sid: 1, t: 'guest', name: '43', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 139, sid: 1, t: 'guest', name: '43', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 140, sid: 1, t: 'guest', name: '43', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 141, sid: 1, t: 'guest', name: '44', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 142, sid: 1, t: 'guest', name: '44', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 143, sid: 1, t: 'guest', name: '44', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 144, sid: 1, t: 'guest', name: '44', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 145, sid: 1, t: 'guest', name: '45', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 146, sid: 1, t: 'guest', name: '45', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 147, sid: 1, t: 'guest', name: '46', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 148, sid: 1, t: 'guest', name: '46', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 149, sid: 1, t: 'guest', name: '46', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 150, sid: 1, t: 'guest', name: '47', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 151, sid: 1, t: 'guest', name: '47', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 152, sid: 1, t: 'guest', name: '47', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 153, sid: 1, t: 'guest', name: '48', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 154, sid: 1, t: 'guest', name: '48', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 155, sid: 1, t: 'guest', name: '49', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 156, sid: 1, t: 'guest', name: '49', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 157, sid: 1, t: 'guest', name: '49', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 158, sid: 1, t: 'guest', name: '49', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 159, sid: 1, t: 'guest', name: '49', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 160, sid: 1, t: 'guest', name: '50', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 161, sid: 1, t: 'guest', name: '50', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 162, sid: 1, t: 'guest', name: '50', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 163, sid: 1, t: 'guest', name: '51', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 164, sid: 1, t: 'guest', name: '51', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 165, sid: 1, t: 'guest', name: '51', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 166, sid: 1, t: 'guest', name: '51', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 167, sid: 1, t: 'guest', name: '52', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 168, sid: 1, t: 'guest', name: '52', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 169, sid: 1, t: 'guest', name: '52', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 170, sid: 1, t: 'guest', name: '52', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 171, sid: 1, t: 'guest', name: '53', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 172, sid: 1, t: 'guest', name: '53', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 173, sid: 1, t: 'guest', name: '53', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 174, sid: 1, t: 'guest', name: '53', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 175, sid: 1, t: 'guest', name: '53', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 176, sid: 1, t: 'guest', name: '54', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 177, sid: 1, t: 'guest', name: '54', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 178, sid: 1, t: 'guest', name: '55', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 179, sid: 1, t: 'guest', name: '55', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 180, sid: 1, t: 'guest', name: '56', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 181, sid: 1, t: 'guest', name: '56', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 182, sid: 1, t: 'guest', name: '57', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 183, sid: 1, t: 'guest', name: '57', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 184, sid: 1, t: 'guest', name: '57', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 185, sid: 1, t: 'guest', name: '58', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 186, sid: 1, t: 'guest', name: '58', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 187, sid: 1, t: 'guest', name: '58', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 188, sid: 1, t: 'guest', name: '58', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 189, sid: 1, t: 'guest', name: '58', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 190, sid: 1, t: 'guest', name: '59', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 191, sid: 1, t: 'guest', name: '59', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 192, sid: 1, t: 'guest', name: '59', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 193, sid: 1, t: 'guest', name: '60', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 194, sid: 1, t: 'guest', name: '60', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 195, sid: 1, t: 'guest', name: '60', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 196, sid: 1, t: 'guest', name: '60', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 197, sid: 1, t: 'guest', name: '61', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 198, sid: 1, t: 'guest', name: '61', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 199, sid: 1, t: 'guest', name: '61', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 200, sid: 1, t: 'guest', name: '61', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 201, sid: 1, t: 'guest', name: '62', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 202, sid: 1, t: 'guest', name: '62', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 203, sid: 1, t: 'guest', name: '62', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 204, sid: 1, t: 'guest', name: '62', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 205, sid: 1, t: 'guest', name: '62', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 206, sid: 1, t: 'guest', name: '63', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 207, sid: 1, t: 'guest', name: '63', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 208, sid: 1, t: 'guest', name: '63', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 209, sid: 1, t: 'guest', name: '63', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 210, sid: 1, t: 'guest', name: '63', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 211, sid: 1, t: 'guest', name: '64', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 212, sid: 1, t: 'guest', name: '64', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 213, sid: 1, t: 'guest', name: '64', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 214, sid: 1, t: 'guest', name: '64', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 215, sid: 1, t: 'guest', name: '64', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 216, sid: 1, t: 'guest', name: '65', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 217, sid: 1, t: 'guest', name: '65', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 218, sid: 1, t: 'guest', name: '65', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 219, sid: 1, t: 'guest', name: '65', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 220, sid: 1, t: 'guest', name: '65', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 221, sid: 1, t: 'guest', name: '66', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 222, sid: 1, t: 'guest', name: '66', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 223, sid: 1, t: 'guest', name: '66', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 224, sid: 1, t: 'guest', name: '67', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 225, sid: 1, t: 'guest', name: '67', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 226, sid: 1, t: 'guest', name: '68', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 227, sid: 1, t: 'guest', name: '68', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 228, sid: 1, t: 'guest', name: '68', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 229, sid: 1, t: 'guest', name: '68', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 230, sid: 1, t: 'guest', name: '69', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 231, sid: 1, t: 'guest', name: '69', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 232, sid: 1, t: 'guest', name: '69', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 233, sid: 1, t: 'guest', name: '70', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 234, sid: 1, t: 'guest', name: '70', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 235, sid: 1, t: 'guest', name: '70', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 236, sid: 1, t: 'guest', name: '70', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 237, sid: 1, t: 'guest', name: '70', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 238, sid: 1, t: 'guest', name: '71', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 239, sid: 1, t: 'guest', name: '71', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 240, sid: 1, t: 'guest', name: '71', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 241, sid: 1, t: 'guest', name: '72', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 242, sid: 1, t: 'guest', name: '72', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 243, sid: 1, t: 'guest', name: '72', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 244, sid: 1, t: 'guest', name: '73', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 245, sid: 1, t: 'guest', name: '73', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 246, sid: 1, t: 'guest', name: '73', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 247, sid: 1, t: 'guest', name: '74', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 248, sid: 1, t: 'guest', name: '74', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 249, sid: 1, t: 'guest', name: '74', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 250, sid: 1, t: 'guest', name: '74', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 251, sid: 1, t: 'guest', name: '74', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 252, sid: 1, t: 'guest', name: '75', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 253, sid: 1, t: 'guest', name: '75', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 254, sid: 1, t: 'guest', name: '76', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 255, sid: 1, t: 'guest', name: '76', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 256, sid: 1, t: 'guest', name: '76', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 257, sid: 1, t: 'guest', name: '76', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 258, sid: 1, t: 'guest', name: '76', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 259, sid: 1, t: 'guest', name: '77', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 260, sid: 1, t: 'guest', name: '77', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 261, sid: 1, t: 'guest', name: '78', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 262, sid: 1, t: 'guest', name: '78', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 263, sid: 1, t: 'guest', name: '79', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 264, sid: 1, t: 'guest', name: '79', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 265, sid: 1, t: 'guest', name: '79', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 266, sid: 1, t: 'guest', name: '79', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 267, sid: 1, t: 'guest', name: '79', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 268, sid: 1, t: 'guest', name: '80', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 269, sid: 1, t: 'guest', name: '80', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 270, sid: 1, t: 'guest', name: '80', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 271, sid: 1, t: 'guest', name: '80', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 272, sid: 1, t: 'guest', name: '81', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 273, sid: 1, t: 'guest', name: '81', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 274, sid: 1, t: 'guest', name: '82', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 275, sid: 1, t: 'guest', name: '82', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 276, sid: 1, t: 'guest', name: '82', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 277, sid: 1, t: 'guest', name: '82', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 278, sid: 1, t: 'guest', name: '82', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 279, sid: 1, t: 'guest', name: '83', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 280, sid: 1, t: 'guest', name: '83', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 281, sid: 1, t: 'guest', name: '83', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 282, sid: 1, t: 'guest', name: '84', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 283, sid: 1, t: 'guest', name: '84', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 284, sid: 1, t: 'guest', name: '85', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 285, sid: 1, t: 'guest', name: '85', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 286, sid: 1, t: 'guest', name: '86', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 287, sid: 1, t: 'guest', name: '86', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 288, sid: 1, t: 'guest', name: '87', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 289, sid: 1, t: 'guest', name: '87', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 290, sid: 1, t: 'guest', name: '87', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 291, sid: 1, t: 'guest', name: '87', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 292, sid: 1, t: 'guest', name: '88', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 293, sid: 1, t: 'guest', name: '88', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 294, sid: 1, t: 'guest', name: '88', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 295, sid: 1, t: 'guest', name: '88', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 296, sid: 1, t: 'guest', name: '88', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 297, sid: 1, t: 'guest', name: '89', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 298, sid: 1, t: 'guest', name: '89', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 299, sid: 1, t: 'guest', name: '89', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 300, sid: 1, t: 'guest', name: '89', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 301, sid: 1, t: 'guest', name: '90', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 302, sid: 1, t: 'guest', name: '90', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 303, sid: 1, t: 'guest', name: '90', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 304, sid: 1, t: 'guest', name: '91', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 305, sid: 1, t: 'guest', name: '91', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 306, sid: 1, t: 'guest', name: '91', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 307, sid: 1, t: 'guest', name: '91', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 308, sid: 1, t: 'guest', name: '91', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 309, sid: 1, t: 'guest', name: '92', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 310, sid: 1, t: 'guest', name: '92', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 311, sid: 1, t: 'guest', name: '92', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 312, sid: 1, t: 'guest', name: '92', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 313, sid: 1, t: 'guest', name: '93', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 314, sid: 1, t: 'guest', name: '93', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 315, sid: 1, t: 'guest', name: '93', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 316, sid: 1, t: 'guest', name: '94', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 317, sid: 1, t: 'guest', name: '94', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 318, sid: 1, t: 'guest', name: '95', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 319, sid: 1, t: 'guest', name: '95', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 320, sid: 1, t: 'guest', name: '96', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 321, sid: 1, t: 'guest', name: '96', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 322, sid: 1, t: 'guest', name: '96', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 323, sid: 1, t: 'guest', name: '96', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 324, sid: 1, t: 'guest', name: '96', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 325, sid: 1, t: 'guest', name: '97', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 326, sid: 1, t: 'guest', name: '97', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 327, sid: 1, t: 'guest', name: '97', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 328, sid: 1, t: 'guest', name: '98', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 329, sid: 1, t: 'guest', name: '98', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 330, sid: 1, t: 'guest', name: '99', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 331, sid: 1, t: 'guest', name: '99', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 332, sid: 1, t: 'guest', name: '100', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 333, sid: 1, t: 'guest', name: '100', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 334, sid: 1, t: 'guest', name: '100', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 335, sid: 1, t: 'guest', name: '100', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 336, sid: 1, t: 'guest', name: '101', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 337, sid: 1, t: 'guest', name: '101', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 338, sid: 1, t: 'guest', name: '101', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 339, sid: 1, t: 'guest', name: '101', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 340, sid: 1, t: 'guest', name: '101', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 341, sid: 1, t: 'guest', name: '102', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 342, sid: 1, t: 'guest', name: '102', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 343, sid: 1, t: 'guest', name: '102', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 344, sid: 1, t: 'guest', name: '102', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 345, sid: 1, t: 'guest', name: '102', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 346, sid: 1, t: 'guest', name: '103', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 347, sid: 1, t: 'guest', name: '103', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 348, sid: 1, t: 'guest', name: '103', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 349, sid: 1, t: 'guest', name: '103', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 350, sid: 1, t: 'guest', name: '103', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 351, sid: 1, t: 'guest', name: '104', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 352, sid: 1, t: 'guest', name: '104', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 353, sid: 1, t: 'guest', name: '104', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 354, sid: 1, t: 'guest', name: '104', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 355, sid: 1, t: 'guest', name: '104', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 356, sid: 1, t: 'guest', name: '105', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 357, sid: 1, t: 'guest', name: '105', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 358, sid: 1, t: 'guest', name: '106', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 359, sid: 1, t: 'guest', name: '106', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 360, sid: 1, t: 'guest', name: '106', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 361, sid: 1, t: 'guest', name: '107', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 362, sid: 1, t: 'guest', name: '107', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 363, sid: 1, t: 'guest', name: '107', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 364, sid: 1, t: 'guest', name: '107', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 365, sid: 1, t: 'guest', name: '107', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 366, sid: 1, t: 'guest', name: '108', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 367, sid: 1, t: 'guest', name: '108', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 368, sid: 1, t: 'guest', name: '108', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 369, sid: 1, t: 'guest', name: '108', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 370, sid: 1, t: 'guest', name: '108', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 371, sid: 1, t: 'guest', name: '109', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 372, sid: 1, t: 'guest', name: '109', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 373, sid: 1, t: 'guest', name: '110', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 374, sid: 1, t: 'guest', name: '110', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 375, sid: 1, t: 'guest', name: '110', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 376, sid: 1, t: 'guest', name: '110', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 377, sid: 1, t: 'guest', name: '111', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 378, sid: 1, t: 'guest', name: '111', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 379, sid: 1, t: 'guest', name: '112', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 380, sid: 1, t: 'guest', name: '112', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 381, sid: 1, t: 'guest', name: '112', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 382, sid: 1, t: 'guest', name: '112', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 383, sid: 1, t: 'guest', name: '112', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 384, sid: 1, t: 'guest', name: '113', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 385, sid: 1, t: 'guest', name: '113', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 386, sid: 1, t: 'guest', name: '113', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 387, sid: 1, t: 'guest', name: '113', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 388, sid: 1, t: 'guest', name: '114', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 389, sid: 1, t: 'guest', name: '114', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 390, sid: 1, t: 'guest', name: '115', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 391, sid: 1, t: 'guest', name: '115', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 392, sid: 1, t: 'guest', name: '115', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 393, sid: 1, t: 'guest', name: '115', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 394, sid: 1, t: 'guest', name: '116', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 395, sid: 1, t: 'guest', name: '116', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 396, sid: 1, t: 'guest', name: '116', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 397, sid: 1, t: 'guest', name: '116', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 398, sid: 1, t: 'guest', name: '117', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 399, sid: 1, t: 'guest', name: '117', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 400, sid: 1, t: 'guest', name: '117', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 401, sid: 1, t: 'guest', name: '118', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 402, sid: 1, t: 'guest', name: '118', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 403, sid: 1, t: 'guest', name: '118', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 404, sid: 1, t: 'guest', name: '119', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 405, sid: 1, t: 'guest', name: '119', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 406, sid: 1, t: 'guest', name: '120', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 407, sid: 1, t: 'guest', name: '120', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 408, sid: 1, t: 'guest', name: '120', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 409, sid: 1, t: 'guest', name: '120', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 410, sid: 1, t: 'guest', name: '120', sex: 'm', hobby: 'h4'});
d.assert('missManners', {id: 411, sid: 1, t: 'guest', name: '121', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 412, sid: 1, t: 'guest', name: '121', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 413, sid: 1, t: 'guest', name: '121', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 414, sid: 1, t: 'guest', name: '121', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 415, sid: 1, t: 'guest', name: '122', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 416, sid: 1, t: 'guest', name: '122', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 417, sid: 1, t: 'guest', name: '122', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 418, sid: 1, t: 'guest', name: '123', sex: 'm', hobby: 'h2'});
d.assert('missManners', {id: 419, sid: 1, t: 'guest', name: '123', sex: 'm', hobby: 'h3'});
d.assert('missManners', {id: 420, sid: 1, t: 'guest', name: '123', sex: 'm', hobby: 'h1'});
d.assert('missManners', {id: 421, sid: 1, t: 'guest', name: '123', sex: 'm', hobby: 'h5'});
d.assert('missManners', {id: 422, sid: 1, t: 'guest', name: '124', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 423, sid: 1, t: 'guest', name: '124', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 424, sid: 1, t: 'guest', name: '124', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 425, sid: 1, t: 'guest', name: '125', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 426, sid: 1, t: 'guest', name: '125', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 427, sid: 1, t: 'guest', name: '125', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 428, sid: 1, t: 'guest', name: '125', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 429, sid: 1, t: 'guest', name: '126', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 430, sid: 1, t: 'guest', name: '126', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 431, sid: 1, t: 'guest', name: '126', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 432, sid: 1, t: 'guest', name: '126', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 433, sid: 1, t: 'guest', name: '127', sex: 'f', hobby: 'h5'});
d.assert('missManners', {id: 434, sid: 1, t: 'guest', name: '127', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 435, sid: 1, t: 'guest', name: '128', sex: 'f', hobby: 'h2'});
d.assert('missManners', {id: 436, sid: 1, t: 'guest', name: '128', sex: 'f', hobby: 'h4'});
d.assert('missManners', {id: 437, sid: 1, t: 'guest', name: '128', sex: 'f', hobby: 'h1'});
d.assert('missManners', {id: 438, sid: 1, t: 'guest', name: '128', sex: 'f', hobby: 'h3'});
d.assert('missManners', {id: 439, sid: 1, t: 'lastSeat', seat: 128});

