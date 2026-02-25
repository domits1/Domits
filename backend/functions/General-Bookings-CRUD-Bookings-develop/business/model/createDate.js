class CreateDate {

    static createUnixTime(){
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        const timestamp = date.getTime();

        return timestamp;
    }

    static modifyUnixTime(input){
        const date = new Date(Number.parseFloat(input));
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }
}

export default CreateDate;