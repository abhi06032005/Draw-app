
import { CanvasRoom } from "./CanvasRoom";

export default async function CanvasPage({params}:{
    params:{
        roomId :string
    }
}) {

    const roomId =(await params).roomId
    console.log(roomId)
    return(
        
        <CanvasRoom roomId={roomId} />
    )
}

//this just extracts the roomId from the url and passes it to the CanvasRoom component