import { useEffect, useState } from "react";
import { fetchDestinationMenu } from "../services/destinationMenuService";

export const useDestinationMenu = () => {
  const [continents, setContinents] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetchDestinationMenu().then((menu) => {
      if (mounted) {
        setContinents(menu);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return continents;
};
