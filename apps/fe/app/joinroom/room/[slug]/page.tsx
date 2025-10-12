import axios from "axios";
import { BACKEND_URL } from "../../../../config";
import { redirect } from "next/navigation";
import { CanvasRoom } from "../../CanvasRoom";

async function getRoomId(slug: string) {
  try {
    const response = await axios.get(`${BACKEND_URL}/room/${slug}`);
    if (response.status === 200) {
      return response.data.roomId;
    }
  } catch (e) {
    return null;
  }
}

type Params = Promise<{slug: string}>

export default async function Page ({params}: {params : Params}) {
  const {slug} = await params;  //according to nextjs docs 15 upgrade
  const roomId = await getRoomId(slug);

  if (roomId == null) {
    redirect("/create");
  } else {
    return (
      <div>
        <CanvasRoom roomId={roomId}></CanvasRoom>
      </div>
    );
  }
}
