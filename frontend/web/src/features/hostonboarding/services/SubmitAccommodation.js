import { getAccessToken } from "../../../services/getAccessToken";
import { toast } from "react-toastify";

export async function submitAccommodation(navigate, builder) {
  const response = await fetch("https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property", {
    method: "POST",
    headers: {
      Authorization: getAccessToken(),
    },
    body: JSON.stringify(builder.build())
  });

  if (!response.ok) {
    alert(response.statusMessage);
  } else {
    navigate("/hostdashboard");
  }
  console.log(builder.build());
}
