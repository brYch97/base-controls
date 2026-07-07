import { useEffect } from "react";
import { ITaskTextProps } from "../../context";

export const TaskText = (props: ITaskTextProps) => {
    const {task} = props;

    useEffect(() => {
        return () => {
            console.log('unmounting task text for task', task.id);
        }
    }, []);

    return <div>{task.text}</div>
}