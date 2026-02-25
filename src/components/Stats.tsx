import '../styles/Stats.css'

interface StatItem {
  label: string
  value: string | number
  icon?: string
  change?: string
}

interface StatsProps {
  stats: StatItem[]
}

function Stats({ stats }: StatsProps) {
  return (
    <div className="stats-container">
      {stats.map((stat, index) => (
        <div key={index} className="stat-card">
          {stat.icon && <div className="stat-icon">{stat.icon}</div>}
          <div className="stat-content">
            <p className="stat-label">{stat.label}</p>
            <h3 className="stat-value">{stat.value}</h3>
            {stat.change && (
              <span className={`stat-change ${stat.change.startsWith('-') ? 'negative' : 'positive'}`}>
                {stat.change}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Stats
