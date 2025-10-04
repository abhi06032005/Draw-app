import { Atom } from "react-loading-indicators"
export default function Loader(){
    return <div className=" absolute h-screen w-screen bg-gray-900 items-center justify-center flex">
        <div className="items-center">

         <Atom color="#00f3ae" size="large" text="" textColor="#000000" />
        </div>

    </div>

}