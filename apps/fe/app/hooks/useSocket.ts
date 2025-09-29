import { useEffect, useState } from "react";
import { WS_URL } from "../../config";

export function useSocket() {
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState<WebSocket>();

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZTNhNTVlZC02NDA4LTQ1OWMtOTUyNC1hMTZiYmQ4YzA0YzciLCJpYXQiOjE3NTkwNTE2MzJ9.39igDwxbyB3tM8gRdvYoU_GacwWW9i3_gTA6uOYVDpw`);
        ws.onopen = () => {
            setLoading(false);
            setSocket(ws);
        }
    }, []);

    return {
        socket,
        loading
    }

}