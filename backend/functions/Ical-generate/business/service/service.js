import { Repository } from "../../data/repository.js";
import { buildICS, icsKeyForOwner } from "../../util/ics.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";

export class Service {
  repository;
  constructor() { this.repository = new Repository(); }

  async generateFromHostRecords(payload) {
    const arr = Array.isArray(payload) ? payload : [payload];
    if (!arr.length) throw new BadRequestException("Empty payload.");

   
    for (let i=0;i<arr.length;i++){
      const r = arr[i];
      for (const f of ["UID","Dtstamp","Dtstart","Dtend","Summary","AccommodationId","OwnerId"]) {
        if (!r?.[f]) throw new BadRequestException(`[record ${i}] ${f} is required`);
      }
    }

    const ics = buildICS(arr);
    const ownerId = arr[0].OwnerId;
    const key = icsKeyForOwner(ownerId);
    return await this.repository.uploadIcsAndPresign(key, ics);
  }
}