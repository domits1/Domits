import { FilterController } from './controller/filterController.mjs';

let controller = null;

export const handler = async (event) => {
  if (!controller) {
    controller = new FilterController();
  }
  return controller.getFilteredProperties(event);
};
