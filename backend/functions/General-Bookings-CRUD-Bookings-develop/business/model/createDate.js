class CreateDate {

    static createUnixTime(){
        return Date.now();
    }

    static modifyUnixTime(input){
        const date = new Date(parseFloat(input));
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }
}

export default CreateDate;