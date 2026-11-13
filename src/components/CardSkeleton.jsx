// The player card's shape while it loads: name, tabs, tiles, rows (tables.css .rw-skel)
export default function CardSkeleton() {
    return (
        <div className="rw-skel" role="status" aria-label="Loading player">
            <div className="row">
                <span className="b" style={{ width: 'min(320px, 60%)', height: 30 }} />
                <span className="b" style={{ width: 34, height: 18 }} />
            </div>
            <div className="row">
                {[96, 70, 82, 100].map((w, i) => <span key={i} className="b" style={{ width: w, height: 30 }} />)}
            </div>
            <div className="tiles">
                {[0, 1, 2, 3, 4].map(i => <span key={i} className="b" style={{ height: 66 }} />)}
            </div>
            {[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="b" style={{ height: 26 }} />)}
        </div>
    )
}
