import { ITheme, mergeStyleSets } from "@fluentui/react"

export const getMilestoneMarkerStyles = (theme: ITheme) => {
    return mergeStyleSets({
        root: {
            width: 26,
            height: 26,
            padding: 0,
            borderRadius: '50% 50% 50% 0',
            backgroundColor: theme.palette.purple,
            transform: 'rotate(-45deg)',
            transformOrigin: 'center',
            boxShadow: theme.effects.elevation8,
            left: -12,
            top: -5,
            position: 'relative',
            selectors: {
                '& > *': {
                    display: 'none',
                },
            },
        }
    })
}