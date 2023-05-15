const fs = require('fs')

class Command {
    constructor(name, params) {
        this.name = name
        this.params = params
    }
}
class Hotel {
    constructor(floor, roomPerFloor) {
        this.floor = floor
        this.roomPerFloor = roomPerFloor
        this.rooms = this.generateListOfRooms(floor, roomPerFloor)
        this.keycardManager = new KeycardManager(floor, roomPerFloor)
    }
    whichFloorFromIndex(index, roomPerFloor) {
        return Math.ceil((index + 1) / roomPerFloor)
    }
    whichRoomFromIndex(index, roomPerFloor) {
        return (index + 1) % roomPerFloor == 0
            ? roomPerFloor
            : (index + 1) % roomPerFloor
    }
    generateRoomNumber(floor, room) {
        if (room < 10) {
            return floor + '0' + room
        }
        return floor + '' + room
    }
    generateListOfRooms(floor, roomPerFloor) {
        return new Array(floor * roomPerFloor).fill(0).map((item, index) => {
            return new Room(
                this.generateRoomNumber(
                    this.whichFloorFromIndex(index, roomPerFloor),
                    this.whichRoomFromIndex(index, roomPerFloor)
                )
            )
        })
    }
    listAvailableRooms() {
        return this.rooms
            .filter(room => room.isFree())
            .map(room => room.roomNumber)
    }
    listAllGuests() {
        return this.rooms
            .filter(room => !room.isFree())
            .sort((room1, room2) => room1.keycard.number - room2.keycard.number)
            .map(room => room.guest.name)
    }
    listAllGuestsByAge(predicate, age) {
        switch (predicate) {
            case '>':
                return this.rooms
                    .filter(room => !room.isFree() && room.guest.age > age)
                    .map(room => room.guest.name)
            case '>=':
                return this.rooms
                    .filter(room => !room.isFree() && room.guest.age >= age)
                    .map(room => room.guest.name)
            case '<':
                return this.rooms
                    .filter(room => !room.isFree() && room.guest.age < age)
                    .map(room => room.guest.name)
            case '<=':
                return this.rooms
                    .filter(room => !room.isFree() && room.guest.age <= age)
                    .map(room => room.guest.name)
            case '=':
                return this.rooms
                    .filter(room => !room.isFree() && room.guest.age == age)
                    .map(room => room.guest.name)
            default:
                break
        }
        return []
    }
    findByRoomNumber(roomNumber) {
        return this.rooms.filter(room => room.roomNumber == roomNumber)
    }
    listRoomByFloor(floorNumber) {
        return this.rooms.filter(room => room.roomNumber[0] == floorNumber)
    }
    bookRoom(roomsNumber, guestName, guestAge) {
        const newGuest = new Guest(guestName, guestAge)
        const selectedRoom = this.findByRoomNumber(roomsNumber)[0]
        if (this.listAvailableRooms().length == 0) {
            return null
        } else if (selectedRoom.isFree()) {
            selectedRoom.addGuest(newGuest)
            const keycard = this.keycardManager.getNextKeycard()
            keycard.addGuest(newGuest)
            keycard.addRoom(selectedRoom)
            selectedRoom.addKeycard(keycard)
            return selectedRoom
        } else {
            return selectedRoom
        }
    }
    checkOut(keycardNumberToCheckOut, guestNameToCheckOut) {
        const keycard = this.keycardManager.getKeycardFromNumber(
            keycardNumberToCheckOut
        )
        const roomToCheckOut = keycard.room
        if (keycard.isGuestOwner(guestNameToCheckOut.trim())) {
            roomToCheckOut.checkOut()
            keycard.checkOut()
        }
        return roomToCheckOut
    }
    checkOutByFloor(floorToCheckOut) {
        const roomToCheckOutByFloor = this.listRoomByFloor(floorToCheckOut)
        const roomToCheckOutWithGuest = roomToCheckOutByFloor.filter(
            room => !room.isFree()
        )
        roomToCheckOutWithGuest.forEach(room => {
            room.keycard.checkOut()
            room.checkOut()
        })
        return roomToCheckOutWithGuest
    }
    bookRoomByFloor(
        floorToBook,
        guestNameToBookByFloor,
        guestAgeToBookByFloor
    ) {
        const roomToBookByFloor = this.listRoomByFloor(floorToBook)

        if (
            roomToBookByFloor.filter(room => room.isFree()).length ==
            roomToBookByFloor.length
        ) {
            const bookedRoom = roomToBookByFloor
                .filter(room => room.isFree())
                .map(room => {
                    return this.bookRoom(
                        room.roomNumber,
                        guestNameToBookByFloor,
                        guestAgeToBookByFloor
                    )
                })
            return bookedRoom
        } else {
            return null
        }
    }
    listGuestByFloor(floor) {
        return this.listRoomByFloor(floor).filter(room => !room.isFree())
    }
}

class KeycardManager {
    constructor(floor, roomPerFloor) {
        this.allKeysCard = new Array(floor * roomPerFloor)
            .fill(0)
            .map((item, index) => new Keycard(index + 1))
    }
    getNextKeycard() {
        return this.allKeysCard.find(keycard => keycard.isFree())
    }
    getKeycardFromNumber(number) {
        return this.allKeysCard.find(keycard => keycard.number == number)
    }
}

class Keycard {
    constructor(number) {
        this.number = number
        this.guest = null
        this.room = null
    }

    addGuest(guest) {
        this.guest = guest
    }

    isFree() {
        return this.guest == null
    }

    isGuestOwner(guestName) {
        return this.guest.name == guestName.trim()
    }
    addRoom(room) {
        this.room = room
    }
    checkOut() {
        this.guest = null
        this.room = null
    }
}

class Room {
    constructor(roomNumber) {
        this.roomNumber = roomNumber
        this.keycard = null
        this.guest = null
    }

    addGuest(guest) {
        this.guest = guest
    }
    isFree() {
        return this.guest == null
    }
    addKeycard(keycard) {
        this.keycard = keycard
    }
    checkOut() {
        this.keycard = null
        this.guest = null
    }
    getGuestName() {
        if (this.guest == null) {
            return ''
        }
        return this.guest.name
    }
}

class Guest {
    constructor(name, age) {
        this.name = name
        this.age = age
    }
}

function main() {
    const filename = 'input.txt'
    const commands = getCommandsFromFileName(filename)
    let hotel = null
    commands.forEach(command => {
        switch (command.name.trim()) {
            case 'create_hotel':
                const [floorToCreate, roomPerFloorToCreate] = command.params
                hotel = new Hotel(floorToCreate, roomPerFloorToCreate)
                console.log(
                    `Hotel created with ${hotel.floor} floor(s), ${hotel.roomPerFloor} room(s) per floor.`
                )
                return
            case 'book':
                const [roomToBook, guestNameToBook, guestAgeToBook] =
                    command.params
                const room = hotel.bookRoom(
                    roomToBook,
                    guestNameToBook,
                    guestAgeToBook
                )
                if (room == null) {
                    console.log('Hotel is fully booked.')
                } else if (room.getGuestName() != guestNameToBook) {
                    console.log(
                        `Cannot book room ${roomToBook} for ${guestNameToBook}, The room is currently booked by ${room.guest.name}.`
                    )
                } else {
                    console.log(
                        `Room ${room.roomNumber} is booked by ${room.guest.name} with keycard number ${room.keycard.number}.`
                    )
                }
                return
            case 'list_available_rooms':
                const avaliableRoom = hotel.listAvailableRooms()
                console.log(`${avaliableRoom.join(', ')}`)
                return
            case 'checkout':
                const [keycardNumberToCheckOut, guestNameToCheckOut] =
                    command.params
                const checkOutRoom = hotel.checkOut(
                    keycardNumberToCheckOut,
                    guestNameToCheckOut
                )
                if (checkOutRoom.keycard == null) {
                    console.log(`Room ${checkOutRoom.roomNumber} is checkout.`)
                } else if(checkOutRoom) {
                    console.log(
                        `Only ${checkOutRoom.keycard.guest.name} can checkout with keycard number ${keycardNumberToCheckOut}.`
                    )
                }else  if(checkOutRoom === null) {
                  console.log(`Keycard ${keycardNumberToCheckOut} is not been assign to room.`)
                }
                return
            case 'list_guest':
                const allGuest = hotel.listAllGuests()
                console.log(`${allGuest.join(', ')}`)
                return
            case 'get_guest_in_room':
                const [roomNumber] = command.params
                const roomToFind = hotel.findByRoomNumber(roomNumber)[0]
                console.log(`${roomToFind.guest.name}`)
                return
            case 'list_guest_by_age':
                const [predicate, age] = command.params
                const allGuestByAge = hotel.listAllGuestsByAge(predicate, age)
                console.log(`${allGuestByAge.join(', ')}`)
                return
            case 'list_guest_by_floor':
                const [floor] = command.params
                const roomWithGuest = hotel.listGuestByFloor(floor)
                console.log(
                    roomWithGuest.map(room => room.guest.name).join(', ')
                )
                return
            case 'checkout_guest_by_floor':
                const [floorToCheckOut] = command.params
                const roomToCheckOutWithGuest =
                    hotel.checkOutByFloor(floorToCheckOut)
                console.log(
                    `Room ${roomToCheckOutWithGuest
                        .map(room => room.roomNumber)
                        .join(', ')} are checkout.`
                )
                return
            case 'book_by_floor':
                const [
                    floorToBook,
                    guestNameToBookByFloor,
                    guestAgeToBookByFloor,
                ] = command.params
                const bookedRoom = hotel.bookRoomByFloor(
                    floorToBook,
                    guestNameToBookByFloor,
                    guestAgeToBookByFloor
                )
                if (bookedRoom != null) {
                    console.log(
                        `Room ${bookedRoom
                            .map(room => room.roomNumber)
                            .join(
                                ', '
                            )} are booked with keycard number ${bookedRoom
                            .map(room => room.keycard.number)
                            .join(', ')}`
                    )
                } else {
                    console.log(
                        `Cannot book floor ${floorToBook} for ${guestNameToBookByFloor}.`
                    )
                }
                return
            default:
                return
        }
    })
}

function getCommandsFromFileName(fileName) {
    const file = fs.readFileSync(fileName, 'utf-8')

    return file
        .split('\n')
        .map(line => line.split(' '))
        .map(
            ([commandName, ...params]) =>
                new Command(
                    commandName,
                    params.map(param => {
                        const parsedParam = parseInt(param, 10)

                        return Number.isNaN(parsedParam) ? param : parsedParam
                    })
                )
        )
}

main()

