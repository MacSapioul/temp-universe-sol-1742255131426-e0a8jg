import React, { useEffect } from "react";
import "./RoadmapTimeline.css";

const RoadmapTimeline = () => {
  useEffect(() => {
    const milestones = document.querySelectorAll(".milestone");
    console.log("Milestones trovati:", milestones.length); // Debug

    if (milestones.length === 0) {
      console.error("Nessun milestone trovato nel DOM! Controlla il codice HTML.");
      return;
    }

    let currentIndex = 0;

    const animateTimeline = () => {
      if (currentIndex < milestones.length) {
        console.log(`Attivazione milestone ${currentIndex + 1}`);
        const currentMilestone = milestones[currentIndex];
        currentMilestone.classList.add("active");

        if (currentIndex < milestones.length - 1) {
          const line = currentMilestone.querySelector(".milestone-line");
          if (line) {
            line.classList.add("active");
            line.style.height = "60px"; // Lunghezza fissa per semplicità
          } else {
            console.warn("Linea non trovata per il milestone", currentIndex + 1);
          }
        }

        currentIndex++;
        setTimeout(animateTimeline, 1000); // Delay di 1 secondo
      }
    };

    setTimeout(animateTimeline, 500);

    return () => {
      milestones.forEach((milestone, index) => {
        milestone.classList.remove("active");
        const line = milestone.querySelector(".milestone-line");
        if (line) {
          line.classList.remove("active");
          line.style.height = "0";
        }
      });
    };
  }, []);

  return (
    <div className="roadmap-timeline">
      <h2 className="roadmap-title">ROADMAP</h2>
      <div className="timeline">
        {/* Phase 1 */}
        <div className="timeline-item">
          <div className="milestone">
            <div className="milestone-line"></div>
          </div>
          <div className="timeline-content">
            <h3>Phase 1: Technical Validation & Pre-Launch Preparation</h3>
            <p><strong>Objective:</strong> Ensure a secure launch and build pre-launch excitement.</p>
            <ul>
              <li>Development, testing, and third-party auditing of the smart contract.</li>
              <li>Pre-launch marketing on X, Telegram.</li>
              <li>Promotional content (videos, whitepaper, NFT artwork).</li>
            </ul>
            <p><strong>Milestones:</strong></p>
            <ul>
              <li>Smart contract audit completed.</li>
              <li>5,000 followers before presale.</li>
            </ul>
          </div>
        </div>

        {/* Phase 2 */}
        <div className="timeline-item">
          <div className="milestone">
            <div className="milestone-line"></div>
          </div>
          <div className="timeline-content">
            <h3>Phase 2: Presale & Official Launch</h3>
            <p><strong>Objective:</strong> Secure funding and debut on the market.</p>
            <ul>
              <li>Presale on PinkSale (100 SOL cap, 1 SOL limit).</li>
              <li>100% funds to liquidity on Raydium.</li>
              <li>Liquidity locked for 6 months.</li>
            </ul>
            <p><strong>Milestones:</strong></p>
            <ul>
              <li>100 SOL raised.</li>
              <li>Listing on Raydium within 48 hours.</li>
            </ul>
          </div>
        </div>

        {/* Phase 3 */}
        <div className="timeline-item">
          <div className="milestone">
            <div className="milestone-line"></div>
          </div>
          <div className="timeline-content">
            <h3>Phase 3: Growth & Community Engagement</h3>
            <p><strong>Objective:</strong> Increase visibility and user base.</p>
            <ul>
              <li>Boost on DEXScreener.</li>
              <li>Marketing on X with influencers.</li>
              <li>Listings on Coingecko and CMC.</li>
              <li>Planet Creation Contest with $UNIV prizes.</li>
            </ul>
            <p><strong>Milestones:</strong></p>
            <ul>
              <li>10,000 token holders in 30 days.</li>
              <li>Listings on Coingecko and CMC in 45 days.</li>
            </ul>
          </div>
        </div>

        {/* Phase 4 */}
        <div className="timeline-item">
          <div className="milestone">
            <div className="milestone-line"></div>
          </div>
          <div className="timeline-content">
            <h3>Phase 4: Major Update (Version 2.0)</h3>
            <p><strong>Objective:</strong> Enhance the ecosystem.</p>
            <ul>
              <li>In-game shop for planet upgrades.</li>
              <li>New planet features (bonuses, NFT collaborations).</li>
              <li>Revamped reward system.</li>
            </ul>
            <p><strong>Milestones:</strong></p>
            <ul>
              <li>V2.0 release in 90 days.</li>
              <li>20% increase in compounding volume.</li>
            </ul>
          </div>
        </div>

        {/* Phase 5 */}
        <div className="timeline-item">
          <div className="milestone">
            <div className="milestone-line"></div>
          </div>
          <div className="timeline-content">
            <h3>Phase 5: Long-Term Expansion & Innovation</h3>
            <p><strong>Objective:</strong> Strengthen the ecosystem.</p>
            <ul>
              <li>"Vault Chest" system for staking.</li>
              <li>New planets with unique mechanics.</li>
              <li>3D animations for planet NFTs.</li>
            </ul>
            <p><strong>Milestones:</strong></p>
            <ul>
              <li>Vault launch in 6 months.</li>
              <li>50,000 planets created.</li>
            </ul>
          </div>
        </div>

        {/* Phase 6 */}
        <div className="timeline-item">
          <div className="milestone">
            <div className="milestone-line"></div>
          </div>
          <div className="timeline-content">
            <h3>Future Vision (Phase 6 – Long-Term Outlook)</h3>
            <p><strong>Objective:</strong> Evolve into a leading ecosystem.</p>
            <p><strong>Planned Directions:</strong></p>
            <ul>
              <li>Advanced user interaction features.</li>
              <li>Galaxy expansion with new mechanics.</li>
              <li>Community-driven integrations.</li>
            </ul>
            <p><strong>Milestones:</strong></p>
            <ul>
              <li>To be defined based on growth.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapTimeline;