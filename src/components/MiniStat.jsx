// A stat tile in the graphics' "Worst claim" recipe: the value big, its label in caps beneath
export default function MiniStat({ label, value }) {
    return (
        <div className="rw-tile">
            <div className="v">{value}</div>
            <div className="l">{label}</div>
        </div>
    )
}
