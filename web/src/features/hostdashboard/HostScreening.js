import React from 'react'
import Pages from './Pages.js'

const HostScreening = () => {
  return (
    <main className="page-body">
      <section
        className="host-screening"
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}>
        <Pages />
        <div className="content">
          <h1>Coming soon...</h1>
        </div>
      </section>
    </main>
  )
}

export default HostScreening
