import { mergeStyleSets } from "@fluentui/react"

export const getDatasetControlStyles = (height?: string | null) => {
    return mergeStyleSets({
        datasetControlRoot: {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
/*             display: 'flex',
            flexDirection: 'column',
            ...(height === '100%' ? getFullHeightStyles() : {}) */

        },
        controlContainer: {
            flex: 1
/*             ...(height === '100%' ? getFullHeightStyles() : {}) */
        },
        footer: {

        },
    });
}

const getFullHeightStyles = () => {
    return {
        flexGrow: 1
    }
}